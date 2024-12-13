require('dotenv').config({ path: './backend/.env' });
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const upload = require('./config/multer-config');
const session = require('express-session');
const MongoStore = require('connect-mongo');



const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/auth');
const authController = require('./controllers/authController');
const Product = require('./models/Product');
const { log } = require('console');

const app = express();

app.use(express.static(path.join(__dirname, '../assets')));
app.use('/uploads', express.static('uploads')); 


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use(
    session({
        secret: process.env.SESSION_SECRET, 
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
    })
);

// Routes
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);

// Routes for Rendering Views
app.get('/', (req, res) => {
    res.render('index', { title: 'Home' });
});

app.get('/about', (req, res) => {
    res.render('about', { title: 'About Us' });
});

app.get('/shop', (req, res) => {
    res.render('shop', { title: 'Shop' });
});

app.get('/contact', (req, res) => {
    res.render('contact', { title: 'Contact Us' });
});


app.get('/product-details', async (req, res) => {
    const productId = req.query.id;
    try {
        const product = await Product.findById(productId);
        const relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: product._id } 
        }).limit(4);

        if (product) {
            res.render('product-details', {
                title: 'Product Details',
                product: product,
                relatedProducts: relatedProducts
            });
        } else {
            res.status(404).send('Product not found');
        }
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(500).send('Server Error'); 
    }
});


app.get('/login', (req, res) => {
    res.render('login', { title: 'Admin Login' });
});

app.get('/logout', authController.logout);
// Protected Admin Routes
app.get('/admin-dashboard', authMiddleware, async (req, res) => {
    const { page = 1, limit = 15 } = req.query; 

    try {
        const options = {
            page: parseInt(page, 10), 
            limit: parseInt(limit, 10)
        };
        const result = await Product.paginate({}, options);

        res.render('admin-dashboard', {
            title: 'Admin Dashboard',
            products: result.docs,
            totalPages: result.totalPages,
            currentPage: result.page
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching products');
    }
});

app.post('/admin-dashboard/add', upload, async (req, res) => {
    const { name, category, description } = req.body;
    const imageUrls = req.files ? req.files.map(file => file.path) : [];

    // Create the new product
    const newProduct = new Product({
        name,
        category,
        description,
        imageUrls,
        isListed: true,
    });

    try {
        await newProduct.save();
        res.redirect('/admin-dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding product');
    }
});
app.get('/admin-dashboard/edit/:id', authMiddleware, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).send('Product not found');
        }
        res.render('edit-product', { title: 'Edit Product', product });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching product');
    }
});

app.post('/admin-dashboard/update/:id', authMiddleware, upload, async (req, res) => {
    try {
        const { name, category, description } = req.body;
        const imageUrls = req.files ? req.files.map(file => file.path) : [];

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            {
                name,
                category,
                description,
                imageUrls,
            },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).send('Product not found');
        }

        res.redirect('/admin-dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating product');
    }
});

app.get('/admin-dashboard/delete/:id', authMiddleware, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/admin-dashboard');
    } catch (error) {
        console.error(error); 
        res.status(500).send('Error deleting product');
    }
});

app.get('/toggle-product-listing/:id', authMiddleware, async (req, res) => {
    const product = await Product.findById(req.params.id);
    product.isListed = !product.isListed;
    await product.save();
    res.redirect('/admin-dashboard');
});

app.get('/api/products', async (req, res) => {
    try {
        const category = req.query.category;
        let products;
        if (category) {
            products = await Product.find({ category: new RegExp(category, 'i'), isListed: true }).limit(12);
        } else {
            products = await Product.find({ isListed: true }).limit(12);
        }
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching products');
    }
});
app.get('/api/latest-products', async (req, res) => {
    try {
        const products = await Product.find({ isListed: true }).sort({ _id: -1 }).limit(12);
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching products');
    }
});

app.get('/shop-products', async (req, res) => {
    try {
        const { category, page = 1, limit = 9 } = req.query;
        const query = category && category !== 'new-arrivals' ? { category } : {};
        
        let sortOption = {};
        if (category === 'new-arrivals') {
            sortOption = { createdAt: -1 }; 
        } else {
            sortOption = { _id: -1 };
        }
        
        const products = await Product.find(query)
            .sort(sortOption)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        
        const totalProducts = await Product.countDocuments(query);
        
        res.json({
            products,
            total: totalProducts,
            page: parseInt(page),
            pages: Math.ceil(totalProducts / limit),
            limit: parseInt(limit)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});


module.exports = app;

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    imageUrls: [{ type: String, required: true }],
    isListed: { type: Boolean, default: true }
});

productSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Product', productSchema);

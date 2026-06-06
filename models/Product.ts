import mongoose, { Schema, model, models } from "mongoose";

const ProductVariantSchema = new Schema({
  sku: { 
    type: String, 
    required: true,
  },
  metalName: { 
    type: String, 
    required: true, 
    enum: ["gold", "rose gold", "platinum", "silver"] 
  },
  purity: { 
    type: String, 
    default: "N/A" // e.g. "18K", "22K" for gold, or "N/A"
  },
  diamondType: { 
    type: String, 
    default: "N/A" 
  },
  diamondShape: { 
    type: String, 
    default: "N/A" 
  },
  diamondColor: { 
    type: String, 
    default: "N/A" 
  },
  diamondClarity: { 
    type: String, 
    default: "N/A" 
  },
  priceChange: { 
    type: Number, 
    default: 0 
  },
  images: { 
    type: [String], // Array of Base64 strings specific to this variant
    default: [] 
  },
  finalPrice: { 
    type: Number, 
    required: true 
  },
});

const ProductSchema = new Schema(
  {
    name: { 
      type: String, 
      required: true 
    },
    productId: { 
      type: String, 
      required: true,
      unique: true 
    },
    description: { 
      type: String 
    },
    category: { 
      type: String, 
      required: true,
      enum: ["ring", "ear rings", "neckless", "braslet", "chain", "bengels"] 
    },
    images: { 
      type: [String], // Array of Base64 strings for general product
      default: [] 
    },
    metalWeight: { 
      type: Number, 
      required: true 
    },
    diamondWeight: { 
      type: Number, 
      default: 0 
    },
    makingCharge: { 
      type: Number, 
      required: true,
      default: 0
    },
    designCharge: { 
      type: Number, 
      required: true,
      default: 0
    },
    variants: [ProductVariantSchema],
  },
  {
    timestamps: true,
  }
);

export const Product = models.Product || model("Product", ProductSchema);
export default Product;

import mongoose, { Schema, model, models } from "mongoose";

const MetalPricingSchema = new Schema({
  name: { 
    type: String, 
    required: true,
    enum: ["gold", "rose gold", "platinum", "silver"] 
  },
  basePricePer10g: { 
    type: Number, 
    required: true, 
    default: 0 
  },
  purityDropPercentPerCarat: { 
    type: Number, 
    default: 0 // Only applicable to gold
  },
});

const DiamondModifierSchema = new Schema({
  name: { type: String, required: true }, // e.g. "Round", "Princess", "D", "VS1", etc.
  percentageIncrease: { type: Number, required: true, default: 0 },
});

const DiamondPricingSchema = new Schema({
  basePricePerCarat: { type: Number, required: true, default: 0 },
  types: [DiamondModifierSchema],     // e.g. Natural, Lab-Grown
  shapes: [DiamondModifierSchema],    // e.g. Round, Oval, Cushion
  colors: [DiamondModifierSchema],    // e.g. D, E, F, G
  clarities: [DiamondModifierSchema], // e.g. FL, IF, VVS1, VS1
});

const CustomDutySchema = new Schema({
  country: { type: String, required: true },
  dutyPercentage: { type: Number, required: true, default: 0 },
});

const PricingSchema = new Schema(
  {
    _id: { type: String, default: "global" },
    metals: [MetalPricingSchema],
    diamond: {
      type: DiamondPricingSchema,
      required: true,
      default: () => ({})
    },
    customDuties: [CustomDutySchema],
  },
  {
    timestamps: true,
  }
);

export const Pricing = models.Pricing || model("Pricing", PricingSchema);
export default Pricing;

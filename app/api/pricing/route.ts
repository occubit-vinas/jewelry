import { connectDB } from "@/lib/mongoose";
import { Pricing } from "@/models/Pricing";

const DEFAULT_PRICING = {
  _id: "global",
  metals: [
    { name: "gold", basePricePer10g: 0, purityDropPercentPerCarat: 0 },
    { name: "rose gold", basePricePer10g: 0, purityDropPercentPerCarat: 0 },
    { name: "platinum", basePricePer10g: 0, purityDropPercentPerCarat: 0 },
    { name: "silver", basePricePer10g: 0, purityDropPercentPerCarat: 0 },
  ],
  diamond: {
    basePricePerCarat: 0,
    types: [],
    shapes: [],
    colors: [],
    clarities: [],
  },
  customDuties: [],
};

export async function GET() {
  try {
    await connectDB();
    let pricing = await Pricing.findById("global");

    if (!pricing) {
      // Return the default template if nothing has been saved yet
      return Response.json(DEFAULT_PRICING);
    }

    return Response.json(pricing);
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    // Clean or validate inputs here if needed
    const pricing = await Pricing.findOneAndUpdate(
      { _id: "global" },
      {
        $set: {
          metals: body.metals || [],
          diamond: body.diamond || {},
          customDuties: body.customDuties || [],
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    return Response.json({ success: true, data: pricing });
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

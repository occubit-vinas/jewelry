import { connectDB } from "@/lib/mongoose";
import { Seller } from "@/models/Seller";
import { Product } from "@/models/Product"; // Imported to register schema in Mongoose

export async function GET() {
  try {
    await connectDB();
    
    // Fetch all sellers, exclude password hashes, populate allowedProducts details
    const sellers = await Seller.find({})
      .select("-password")
      .populate("allowedProducts")
      .sort({ createdAt: -1 });

    return Response.json(sellers);
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

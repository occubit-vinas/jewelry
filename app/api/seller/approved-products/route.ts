import { connectDB } from "@/lib/mongoose";
import { Seller } from "@/models/Seller";
import { Product } from "@/models/Product"; // Imported to register schema in Mongoose

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return Response.json(
        { success: false, error: "Email query parameter is required." },
        { status: 400 }
      );
    }

    // Find the seller, exclude password, populate allowedProducts references
    const seller = await Seller.findOne({ email: email.toLowerCase() })
      .select("-password")
      .populate("allowedProducts");

    if (!seller) {
      return Response.json(
        { success: false, error: "Seller account not found." },
        { status: 404 }
      );
    }

    // Block retrieval if the admin hasn't approved the seller yet
    if (seller.status !== "approved") {
      return Response.json(
        { 
          success: false, 
          error: "Your seller account registration has not been approved by the administrator yet.",
          status: seller.status 
        },
        { status: 403 }
      );
    }

    return Response.json({
      success: true,
      allowedProducts: seller.allowedProducts || []
    });
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

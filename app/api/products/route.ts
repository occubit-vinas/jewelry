import { connectDB } from "@/lib/mongoose";
import { Product } from "@/models/Product";

export async function GET() {
  try {
    await connectDB();
    const products = await Product.find({}).sort({ createdAt: -1 });
    return Response.json(products);
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

    if (!body.productId) {
      return Response.json(
        { success: false, error: "Product ID is required." },
        { status: 400 }
      );
    }

    // Check if product with ID already exists
    const existing = await Product.findOne({ productId: body.productId });
    if (existing) {
      return Response.json(
        { success: false, error: `Product ID "${body.productId}" already exists.` },
        { status: 400 }
      );
    }

    const newProduct = await Product.create(body);

    return Response.json({ success: true, data: newProduct }, { status: 201 });
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

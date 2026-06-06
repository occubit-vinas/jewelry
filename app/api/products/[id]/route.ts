import { connectDB } from "@/lib/mongoose";
import { Product } from "@/models/Product";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return Response.json(
        { success: false, error: "Product not found." },
        { status: 404 }
      );
    }

    return Response.json({ success: true, data: updatedProduct });
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const deleted = await Product.findByIdAndDelete(id);

    if (!deleted) {
      return Response.json(
        { success: false, error: "Product not found." },
        { status: 404 }
      );
    }

    return Response.json({ success: true, message: "Product deleted successfully." });
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

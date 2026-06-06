import { connectDB } from "@/lib/mongoose";
import { Seller } from "@/models/Seller";
import { Product } from "@/models/Product"; // Imported to register schema in Mongoose

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const updates: any = {};
    if (body.status !== undefined) {
      if (!["pending", "approved", "rejected"].includes(body.status)) {
        return Response.json(
          { success: false, error: "Invalid status value." },
          { status: 400 }
        );
      }
      updates.status = body.status;
    }
    
    if (body.allowedProducts !== undefined) {
      updates.allowedProducts = body.allowedProducts;
    }

    const updatedSeller = await Seller.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .select("-password")
      .populate("allowedProducts");

    if (!updatedSeller) {
      return Response.json(
        { success: false, error: "Seller not found." },
        { status: 404 }
      );
    }

    return Response.json({ success: true, data: updatedSeller });
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

    const deleted = await Seller.findByIdAndDelete(id);

    if (!deleted) {
      return Response.json(
        { success: false, error: "Seller not found." },
        { status: 404 }
      );
    }

    return Response.json({ success: true, message: "Seller deleted successfully." });
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

import { connectDB } from "@/lib/mongoose";
import { Seller } from "@/models/Seller";
import { verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json(
        { success: false, error: "Please enter both email and password." },
        { status: 400 }
      );
    }

    const seller = await Seller.findOne({ email: email.toLowerCase() });
    if (!seller) {
      return Response.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isMatch = verifyPassword(password, seller.password);
    if (!isMatch) {
      return Response.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    return Response.json({
      success: true,
      data: { name: seller.name, email: seller.email },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

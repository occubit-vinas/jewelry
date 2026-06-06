import { connectDB } from "@/lib/mongoose";
import { Seller } from "@/models/Seller";
import { hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return Response.json(
        { success: false, error: "Please enter your name, email, and password." },
        { status: 400 }
      );
    }

    const existing = await Seller.findOne({ email: email.toLowerCase() });
    if (existing) {
      return Response.json(
        { success: false, error: "Email address is already registered." },
        { status: 400 }
      );
    }

    const hashedPassword = hashPassword(password);
    const seller = await Seller.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    return Response.json(
      { success: true, data: { name: seller.name, email: seller.email } },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

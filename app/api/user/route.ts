import clientPromise from "@/lib/mongodb";
import { connectDB } from "@/lib/mongoose";
import { User } from "@/models/User";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(); // Connects to your default database
    // Fetch all collections information
    const collections = await db.listCollections().toArray();
    // Extract just the names of the collections
    const collectionNames = collections.map((col) => col.name);
    return Response.json({
      success: true,
      collections, // Returns full metadata (name, type, options, info, etc.)
      collectionNames, // Returns just an array of names e.g., ["users"]
    });
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
  // try {
  //   await connectDB();
  //   const users = await User.find({});
  //   return Response.json(users);
  // } catch (error) {
  //   return Response.json({ error: String(error) }, { status: 500 });
  // }

  // const client = await clientPromise;

  // const users = await client
  //   .db()
  //   .collection("User")
  //   .find({})
  //   .toArray();

  // const users = await client.db().admin().listDatabases()

  // return Response.json(users);
}

// export async function POST(req: Request) {
//   try {
//     await connectDB();

//     const body = await req.json();

//     const user = await User.create({
//       name: body.name,
//       email: body.email,
//       age: body.age,
//     });

//     return Response.json(user, { status: 201 });
//   } catch (error) {
//     return Response.json(
//       { error: String(error) },
//       { status: 500 }
//     );
//   }
// }

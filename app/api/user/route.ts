import clientPromise from "@/lib/mongodb";
// import { connectDB } from "@/lib/mongoose";
// import { User } from "@/models/User";

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
}

// export async function GET() {
//   try {
//     const client = await clientPromise;
//     const db = client.db();

//     const products = await db
//       .collection("products")
//       .find({})
//       .toArray();

//     return Response.json({
//       success: true,
//       products,
//     });
//   } catch (error) {
//     return Response.json(
//       {
//         success: false,
//         error: String(error),
//       },
//       { status: 500 }
//     );
//   }
// }
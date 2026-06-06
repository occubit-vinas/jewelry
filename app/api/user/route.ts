
import clientPromise from "@/lib/mongodb";
export async function GET() {
  const client = await clientPromise;

  const users = await client
    .db()
    .collection("admin")
    .find({})
    .toArray();

    // client.db().admin().listDatabases()

  return Response.json(users);
}
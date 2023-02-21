import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { DynamoDB } from "aws-sdk";
import aws from "aws-sdk";
import { PutItemInput } from "aws-sdk/clients/dynamodb";
import serverless from "serverless-http";

dotenv.config();

const PORT = process.env.PORT || 8081;
const TABLE_NAME = process.env.TABLE_NAME as string;

const app = express();
app.use(express.json());
app.use(cors());

const db = new DynamoDB.DocumentClient({
  convertEmptyValues: true,
  endpoint: "https://dynamodb.eu-central-1.amazonaws.com",
});

const findItem = async (id: string) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      id,
    },
  };

  return await db.get(params).promise();
};
const create = async (id: string, data: any) => {
  const params: PutItemInput = {
    TableName: TABLE_NAME,
    Item: {
      id,
      ...data,
    },
  };

  await db.put(params).promise();

  return params.Item;
};

app.post("/api/v1/waitlist", async (req, res) => {
  const data = req.body;

  const foundItem = await findItem(data.twitter);

  if (foundItem.Item) {
    res.json({ code: 409, message: "Item already exists" });

    return;
  }
  const created = await create(data.twitter, data);

  res.json(created);
});

if (process.env.ENVIRONMENT === "production") {
  exports.handler = serverless(app, { provider: "aws" });
} else {
  app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}.`);
  });
}

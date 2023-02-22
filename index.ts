import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { DynamoDB } from "aws-sdk";
import { PutItemInput } from "aws-sdk/clients/dynamodb";
import serverless from "serverless-http";
import cookieParser from "cookie-parser";
import aws from "aws-sdk";

dotenv.config();

const PORT = process.env.PORT || 8081;
const TABLE_NAME = process.env.TABLE_NAME as string;

const app = express();
app.use(express.json());
app.use(cors());
app.use(cookieParser());

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

const isValueExists = async (key: string, value: string) => {
  const params = {
    TableName: TABLE_NAME,
    ExpressionAttributeValues: {
      ":v": value,
    },
    FilterExpression: `${key} = :v`,
    ProjectionExpression: key,
  };

  const res = await db.scan(params).promise();

  return res;
};

app.post("/api/v1/waitlist", async (req, res) => {
  const data = req.body;
  if (Object.values(data).find((value) => value === "")) {
    res.send(400);
    return;
  }
  try {
    const foundItem = await findItem(data.twitter);

    if (foundItem.Item) {
      res.json({ code: 409, message: "Item already exists" });

      return;
    }
    const created = await create(data.twitter, data);
    res.cookie("submitted", true, { httpOnly: true });
    res.json(created);
  } catch (error) {
    res.json(error);
  }
});

app.post("/api/v1/value-exists", async (req, res) => {
  const data = req.body;
  if (Object.values(data).find((value) => value === "")) {
    res.send(400);
    return;
  }
  const key = data.key;
  const value = data.value;

  const isExists = await isValueExists(key, value);

  if (isExists.Count && isExists.Count > 0) {
    res.json({ code: 409, message: `This value already used` });
    return;
  }
  res.json({ code: 200 });
});

app.get("/hello", (req, res) => {
  res.send("hello world");
});

if (process.env.ENVIRONMENT === "production") {
  exports.handler = serverless(app, { provider: "aws" });
} else {
  app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}.`);
  });
}

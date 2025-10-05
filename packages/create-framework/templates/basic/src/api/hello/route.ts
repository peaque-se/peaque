import { PeaqueRequest } from "@peaque/framework";

export function GET(req: PeaqueRequest) {
  req.code(200).type("application/json").send({ message: "Hello, World!" });
}
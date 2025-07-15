import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const healthcheck = asyncHandler(async (req, res) => {
  console.log("Healthcheck route HIT");
  return res
    .status(200)
    .json(new ApiResponse(200, { status: "ok" }, "Healthcheck passed"));
});


export { healthcheck };

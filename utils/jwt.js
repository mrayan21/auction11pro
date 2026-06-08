import jwt from "jsonwebtoken";

export const createToken = (user) => {
  return jwt.sign(
    {
      uid: user.uid,
      phoneNumber: user.phoneNumber
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d"
    }
  );
};
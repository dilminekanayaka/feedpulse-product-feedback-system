import { InferSchemaType, Schema, model, models } from "mongoose";

const userRoleValues = ["admin"] as const;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      validate: {
        validator: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: "Please provide a valid email address.",
      },
    },
    passwordHash: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: userRoleValues,
      default: "admin",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ email: 1 }, { unique: true });

type User = InferSchemaType<typeof userSchema>;

const UserModel = models.User || model("User", userSchema);

export { UserModel, userRoleValues, userSchema };
export type { User };

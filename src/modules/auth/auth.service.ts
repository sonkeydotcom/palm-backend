import { AppError } from "../../utils/app-error";
import { User } from "../../modules/users/user.schema";
import { userService } from "../../modules/users/user.service";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export class AuthService {
  async login(email: string, password: string) {
    // Find user by email
    const user = await userService.findByEmail(email);
    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401);
    }

    // Update last login
    await userService.update(user.id, {
      lastLogin: new Date(),
    });

    // Generate JWT token
    const token = this.generateToken(user);
    return { token, user };
  }

  async register(userData: User) {
    // Create user
    const user = await userService.create(userData);

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    };
  }

  generateToken(user: {
    id: number;
    username: string;
    email: string;
    role: string;
  }) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      "abcd1234",
      { expiresIn: "30d" }
    );
  }

  verifyToken(token: string) {
    try {
      return jwt.verify(token, "abcd1234");
    } catch (error) {
      throw new AppError(`Invalid or expired token, ${error}`, 401);
    }
  }
}

export const authService = new AuthService();

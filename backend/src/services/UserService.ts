import jwt from 'jsonwebtoken';
import validator from 'validator';
import User, { IUser } from '../models/User.js';
import { config } from '../config/env.js';

/**
 * Interface for user registration data
 */
export interface RegisterData {
  email?: string;
  phone?: string;
  password: string;
  role?: 'buyer' | 'seller' | 'admin';
  firstName?: string;
  lastName?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
}

/**
 * Interface for JWT token payload
 */
export interface TokenPayload {
  userId: string;
  role: 'buyer' | 'seller' | 'admin';
}

/**
 * Interface for decoded JWT token
 */
export interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
}

/**
 * UserService handles user authentication and registration
 */
export class UserService {
  /**
   * Validate email format
   */
  private validateEmail(email: string): boolean {
    return validator.isEmail(email);
  }

  /**
   * Validate phone number format (Nepali phone numbers)
   * Accepts formats: 9841234567, +9779841234567, 01-4123456
   */
  private validatePhone(phone: string): boolean {
    // Remove spaces and dashes
    const cleanPhone = phone.replace(/[\s-]/g, '');
    
    // Check for valid Nepali mobile number (98xxxxxxxx or +97798xxxxxxxx)
    const mobilePattern = /^(\+977)?9[78]\d{8}$/;
    
    // Check for valid Nepali landline (01xxxxxxx or +97701xxxxxxx)
    const landlinePattern = /^(\+977)?0[1-9]\d{6,7}$/;
    
    return mobilePattern.test(cleanPhone) || landlinePattern.test(cleanPhone);
  }

  /**
   * Validate password strength
   * Requirements: minimum 8 characters, mixed case, numbers
   */
  private validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Register a new user
   * @param userData - User registration data
   * @returns Created user and JWT token
   * @throws Error if validation fails or user already exists
   */
  async register(userData: RegisterData): Promise<{ user: IUser; token: string }> {
    const { email, phone, password, role = 'buyer', ...otherData } = userData;

    // Validate that at least email or phone is provided
    if (!email && !phone) {
      throw new Error('Either email or phone number is required');
    }

    // Validate email if provided
    if (email && !this.validateEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Validate phone if provided
    if (phone && !this.validatePhone(phone)) {
      throw new Error('Invalid phone number format');
    }

    // Validate password strength
    const passwordValidation = this.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.errors.join('. '));
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        ...(email ? [{ email: email.toLowerCase() }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    });

    if (existingUser) {
      if (email && existingUser.email === email.toLowerCase()) {
        throw new Error('Email already registered');
      }
      if (phone && existingUser.phone === phone) {
        throw new Error('Phone number already registered');
      }
    }

    // Set verification status based on role
    const verificationStatus = role === 'seller' ? 'pending' : 'approved';

    // Create new user
    const user = new User({
      email: email?.toLowerCase(),
      phone,
      password,
      role,
      verificationStatus,
      ...otherData,
    });

    await user.save();

    // Generate JWT token
    const token = this.generateToken(user._id.toString(), user.role);

    return { user, token };
  }

  /**
   * Login user with email/phone and password
   * @param emailOrPhone - User's email or phone number
   * @param password - User's password
   * @returns User and JWT token
   * @throws Error if credentials are invalid
   */
  async login(
    emailOrPhone: string,
    password: string
  ): Promise<{ user: IUser; token: string }> {
    // Determine if input is email or phone
    const isEmail = emailOrPhone.includes('@');

    // Find user by email or phone
    const user = await User.findOne(
      isEmail
        ? { email: emailOrPhone.toLowerCase() }
        : { phone: emailOrPhone }
    );

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateToken(user._id.toString(), user.role);

    return { user, token };
  }

  /**
   * Generate JWT token with user ID and role
   * @param userId - User's ID
   * @param role - User's role
   * @returns JWT token string
   */
  generateToken(userId: string, role: 'buyer' | 'seller' | 'admin'): string {
    const payload: TokenPayload = {
      userId,
      role,
    };

    const options: jwt.SignOptions = {
      expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    };

    return jwt.sign(payload, config.jwtSecret, options);
  }

  /**
   * Verify JWT token and return decoded payload
   * @param token - JWT token string
   * @returns Decoded token payload
   * @throws Error if token is invalid or expired
   */
  verifyToken(token: string): DecodedToken {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as DecodedToken;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Get user by ID
   * @param userId - User's ID
   * @returns User document
   * @throws Error if user not found
   */
  async getUserById(userId: string): Promise<IUser> {
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}

// Export singleton instance
export const userService = new UserService();

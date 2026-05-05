export class CustomError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
  ) {
    super(message);
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string) {
    super(message, 401);
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string) {
    super(message, 403);
  }
}

export class BadCredentialsError extends CustomError {
  constructor(message?: string) {
    super(
      message ||
        "Invalid credentials. Please check your email and password and try again.",
      401,
    );
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string) {
    super(message, 404);
  }
}

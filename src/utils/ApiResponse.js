class ApiResponse {
  constructor(statusCode, message="Success", data) {
    this.status = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode >= 200 && statusCode < 300;
  }
}

export {ApiResponse}
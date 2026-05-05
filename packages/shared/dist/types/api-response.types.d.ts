export interface ApiResponse<T = unknown> {
    data: T;
    message?: string;
}
export interface ApiError {
    statusCode: number;
    message: string | string[];
    error?: string;
    timestamp?: string;
    path?: string;
}
//# sourceMappingURL=api-response.types.d.ts.map
import 'package:dio/dio.dart';
import 'secure_storage_service.dart';

class ApiService {
  final Dio dio;
  final SecureStorageService storage;
  final String baseUrl;

  ApiService({
    required this.storage,
    this.baseUrl = 'http://localhost:4000',
  }) : dio = Dio(BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
          headers: {'Content-Type': 'application/json'},
        )) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await storage.getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          // Token refresh on 401
          if (error.response?.statusCode == 401 &&
              !error.requestOptions.path.contains('/auth/')) {
            final refreshToken = await storage.getRefreshToken();
            if (refreshToken != null) {
              try {
                final refreshResponse = await dio.post(
                  '/auth/refresh',
                  data: {'refreshToken': refreshToken},
                );

                final newAccessToken =
                    refreshResponse.data['data']['tokens']['accessToken'];
                final newRefreshToken =
                    refreshResponse.data['data']['tokens']['refreshToken'];

                await storage.saveTokens(
                  accessToken: newAccessToken,
                  refreshToken: newRefreshToken,
                );

                error.requestOptions.headers['Authorization'] =
                    'Bearer $newAccessToken';
                final cloneReq = await dio.fetch(error.requestOptions);
                return handler.resolve(cloneReq);
              } catch (_) {
                await storage.clearAuth();
              }
            }
          }
          return handler.next(error);
        },
      ),
    );
  }
}


import 'package:cloud_functions/cloud_functions.dart';
import 'package:referral/app/app.logger.dart';
import 'package:referral/env/env.dart';

class CloudFunctionService {
  final _logger = getLogger('CloudFunctionService');
  final FirebaseFunctions functions;

  CloudFunctionService(this.functions);

  static CloudFunctionService? _instance;
  static bool _isInitialized = false;

  static CloudFunctionService getInstance() {
    if (!_isInitialized) {
      throw StateError(
          'CloudFunctionService not initialised. Call initialize() first.');
    }
    return _instance!;
  }

  static Future<void> initialize() async {
    if (!_isInitialized) {
      final instance = FirebaseFunctions.instanceFor(region: 'europe-west1');
      if (Env.kLocalEmulatorMode) {
        instance.useFunctionsEmulator(
            Env.kLocalhost, Env.kLocalCloudFunctionsPort);
      }
      _instance = CloudFunctionService(instance);
      _isInitialized = true;
    }
  }

  Future<T> callFunction<T>(
      {required String functionName,
      required T Function(Map<String, dynamic> data) converter,
      Map<String, dynamic>? data}) async {
    _logger.i('Calling function: $functionName');
    final HttpsCallable callable = functions.httpsCallable(functionName);
    final result = await callable.call(data);
    _logger.i('Function result: ${result.data}');
    return converter(result.data as Map<String, dynamic>);
  }
}

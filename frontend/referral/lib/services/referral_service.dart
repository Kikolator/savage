import 'package:referral/app/app.locator.dart';
import 'package:referral/app/app.logger.dart';
import 'package:referral/data/referral_code.dart';
import 'package:referral/services/cloud_function_service.dart';
import 'package:referral/services/firestore_service.dart';

class ReferralService {
  final _logger = getLogger('ReferralService');
  final _firestoreService = locator<FirestoreService>();
  final _cloudFunctionService = locator<CloudFunctionService>();

  /// Gets the referral code for the given owner and company.
  /// Returns null if the owner does not have a referral code.
  Future<ReferralCode?> getReferralCode(
      String ownerId, String? companyId) async {
    final ReferralCode? referralCode =
        await _firestoreService.getDocument<ReferralCode>(
      collection: 'referralCodes',
      documentId: ownerId,
      converter: ReferralCode.fromMap,
    );

    return referralCode;
  }

  /// Creates a new referral code for the given owner and company.
  /// If the owner already has a referral code, it will return the existing one.
  /// Returns the created referral code.
  Future<ReferralCode> createReferralCode(
      String ownerId, String? companyId, String token) async {
    try {
      _logger.i(
          'Creating referral code for ownerId: $ownerId, companyId: $companyId, token: $token');
      final referralCode =
          await _cloudFunctionService.callFunction<ReferralCode>(
        functionName: 'createReferralCode',
        converter: ReferralCode.fromMap,
        data: {
          'memberId': ownerId,
          'companyId': companyId,
          'token': token,
        },
      );
      _logger.i('Referral code created: ${referralCode.documentId}');
      return referralCode;
    } catch (e) {
      // TODO: Handle this case.
      rethrow;
    }
  }
}

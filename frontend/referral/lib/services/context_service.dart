import 'package:flutter/foundation.dart';
import 'package:referral/data/referral_context_model.dart';

class ContextService {
  String? _memberId;
  String? get memberId => _memberId;

  String? _companyId;
  String? get companyId => _companyId;

  String? _token;
  String? get token => _token;

  getReferralContext() {
    if (kDebugMode) {
      _memberId = '67b7247f072ebf5a4941c35d';
      _companyId = '67b7247d072ebf5a4941c25c';
      _token =
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3YjcyNDdmMDcyZWJmNWE0OTQxYzM3MyIsImlhdCI6MTc1MDc2ODg5OCwiZXhwIjoxNzUwOTQxNjk4fQ.vbwrhlvseAloCsS4VvqelO_2TggUAbtUPimZSOAqVJA';
      return ReferralContext(
        memberId: _memberId,
        companyId: _companyId,
        token: _token,
      );
    } else {
      // Get query parameters.
      final qp = Uri.base.queryParameters;
      final refCtx = ReferralContext.fromQuery(qp);
      if (refCtx.memberId == null || refCtx.token == null) {
        throw Exception('Invalid referral context');
      }
      _memberId = refCtx.memberId;
      _companyId = refCtx.companyId;
      _token = refCtx.token;
      return refCtx;
    }
  }
}

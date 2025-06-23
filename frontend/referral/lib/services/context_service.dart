import 'package:referral/data/referral_context_model.dart';

class ContextService {
  String? _memberId;
  String? get memberId => _memberId;

  String? _companyId;
  String? get companyId => _companyId;

  String? _token;
  String? get token => _token;

  getReferralContext() {
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

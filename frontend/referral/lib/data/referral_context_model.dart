class ReferralContext {
  final String? memberId;
  final String? memberName;
  final String? companyId;
  final String? companyName;
  final String? token;

  ReferralContext({
    this.memberId,
    this.memberName,
    this.companyId,
    this.companyName,
    this.token,
  });

  factory ReferralContext.fromQuery(Map<String, String> qp) {
    return ReferralContext(
      memberId: qp['memberId'],
      memberName: qp['memberName'],
      companyId: qp['companyId'],
      companyName: qp['companyName'],
      token: qp['token'],
    );
  }
}

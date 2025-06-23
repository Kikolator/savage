enum ReferrerType {
  member,
  business,
}

class ReferralCode {
  final String documentId;
  final String code;
  final String ownerId;
  final String? companyId;
  final ReferrerType ownerType;
  // Total number of referrals made with this code.
  final int totalReferred;
  // Total number of referrals converted to a membership.
  final int totalConverted;
  // Total amount of rewards given out in EUR.
  final double totalRewardedEur;
  // List with users that have been referred with this code.
  final List<String> referredUsers;

  const ReferralCode({
    required this.documentId,
    required this.code,
    required this.ownerId,
    this.companyId,
    required this.ownerType,
    required this.totalReferred,
    required this.totalConverted,
    required this.totalRewardedEur,
    required this.referredUsers,
  });

  factory ReferralCode.fromMap(Map<String, dynamic> data) {
    return ReferralCode(
      documentId: data['documentId'] as String,
      code: data['code'] as String,
      ownerId: data['ownerId'] as String,
      companyId: data['companyId'] as String?,
      ownerType: _parseReferrerType(data['ownerType'] as String),
      totalReferred: data['totalReferred'] as int? ?? 0,
      totalConverted: data['totalConverted'] as int? ?? 0,
      totalRewardedEur: (data['totalRewardedEur'] as num?)?.toDouble() ?? 0.0,
      referredUsers: List<String>.from(data['referredUsers'] ?? []),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'documentId': documentId,
      'code': code,
      'ownerId': ownerId,
      'companyId': companyId,
      'ownerType': _referrerTypeToString(ownerType),
      'totalReferred': totalReferred,
      'totalConverted': totalConverted,
      'totalRewardedEur': totalRewardedEur,
      'referredUsers': referredUsers,
    };
  }

  ReferralCode copyWith({
    String? code,
    String? ownerId,
    String? companyId,
    ReferrerType? ownerType,
    int? totalReferred,
    int? totalConverted,
    double? totalRewardedEur,
    List<String>? referredUsers,
  }) {
    return ReferralCode(
      documentId: documentId ?? this.documentId,
      code: code ?? this.code,
      ownerId: ownerId ?? this.ownerId,
      companyId: companyId ?? this.companyId,
      ownerType: ownerType ?? this.ownerType,
      totalReferred: totalReferred ?? this.totalReferred,
      totalConverted: totalConverted ?? this.totalConverted,
      totalRewardedEur: totalRewardedEur ?? this.totalRewardedEur,
      referredUsers: referredUsers ?? this.referredUsers,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ReferralCode &&
        other.documentId == documentId &&
        other.code == code &&
        other.ownerId == ownerId &&
        other.companyId == companyId &&
        other.ownerType == ownerType &&
        other.totalReferred == totalReferred &&
        other.totalConverted == totalConverted &&
        other.totalRewardedEur == totalRewardedEur &&
        other.referredUsers == referredUsers;
  }

  @override
  int get hashCode {
    return code.hashCode ^
        documentId.hashCode ^
        ownerId.hashCode ^
        companyId.hashCode ^
        ownerType.hashCode ^
        totalReferred.hashCode ^
        totalConverted.hashCode ^
        totalRewardedEur.hashCode ^
        referredUsers.hashCode;
  }

  @override
  String toString() {
    return 'ReferralCode(code: $code, ownerId: $ownerId, companyId: $companyId, ownerType: $ownerType, totalReferred: $totalReferred, totalConverted: $totalConverted, totalRewardedEur: $totalRewardedEur, referredUsers: $referredUsers)';
  }
}

ReferrerType _parseReferrerType(String value) {
  switch (value) {
    case 'member':
      return ReferrerType.member;
    case 'business':
      return ReferrerType.business;
    default:
      throw ArgumentError('Unknown ReferrerType: $value');
  }
}

String _referrerTypeToString(ReferrerType type) {
  switch (type) {
    case ReferrerType.member:
      return 'member';
    case ReferrerType.business:
      return 'business';
  }
}

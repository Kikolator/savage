import 'package:flutter_test/flutter_test.dart';
import 'package:referral/app/app.locator.dart';

import '../helpers/test_helpers.dart';

void main() {
  group('ShowQrDialogModel Tests -', () {
    setUp(() => registerServices());
    tearDown(() => locator.reset());
  });
}

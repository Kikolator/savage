import 'package:flutter/material.dart';
import 'package:referral/data/referral_code.dart';
import 'package:referral/ui/common/ui_helpers.dart';
// import 'package:responsive_builder/responsive_builder.dart';
import 'package:stacked/stacked.dart';

// import 'home_view.desktop.dart';
// import 'home_view.tablet.dart';
// import 'home_view.mobile.dart';
import 'home_viewmodel.dart';

class HomeView extends StackedView<HomeViewModel> {
  final ReferralCode? referralCode;
  const HomeView({this.referralCode, super.key});

  @override
  Widget builder(BuildContext context, HomeViewModel viewModel, Widget? child) {
    return Scaffold(
      body: viewModel.isBusy
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(10.0),
                child: Column(children: [
                  verticalSpaceMedium,
                  if (viewModel.modelError != null) ...[
                    Text(
                      viewModel.modelError,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: Theme.of(context).colorScheme.error),
                    ),
                  ],
                  Text(
                    'Savage Invite',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  Text(
                    'Share your referral code with your friends and start earning!',
                    style: Theme.of(context).textTheme.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                  verticalSpaceMedium,
                  // ElevatedButton(
                  //   onPressed: viewModel.showQRCode,
                  //   child: const Text('Show QR Code'),
                  // ),
                  // verticalSpaceMedium,
                  TextButton.icon(
                    onPressed: viewModel.shareReferralCode,
                    icon: const Icon(Icons.ios_share),
                    label: const Text('Share Your Code'),
                  ),
                  const Divider(),
                  // Referrals send out
                  Card(
                    child: Column(
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(10.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.start,
                            children: [
                              Text(
                                'Referrals send out',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(10.0),
                          child: Text(
                            referralCode!.totalReferred.toString(),
                            style: Theme.of(context).textTheme.displayMedium,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Referrals Converted
                  Card(
                    child: Column(
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(10.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.start,
                            children: [
                              Text(
                                'Referrals Converted',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                        Text(referralCode!.totalConverted.toString(),
                            style: Theme.of(context).textTheme.displayMedium),
                      ],
                    ),
                  ),
                  // Your Rewards Paid Out
                  Card(
                    child: Column(
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(10.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.start,
                            children: [
                              Text(
                                'Rewards Earned',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                        Row(
                          textBaseline: TextBaseline.alphabetic,
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          children: [
                            Text('€',
                                style: Theme.of(context).textTheme.titleLarge),
                            Text(referralCode!.totalRewardedEur.toString(),
                                style:
                                    Theme.of(context).textTheme.displayMedium),
                          ],
                        ),
                      ],
                    ),
                  ),
                ]),
              ),
            ),
    );
  }

  @override
  void onViewModelReady(HomeViewModel viewModel) {
    viewModel.initialise(referralCode);
    super.onViewModelReady(viewModel);
  }

  @override
  HomeViewModel viewModelBuilder(BuildContext context) => HomeViewModel();
}

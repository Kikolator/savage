import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:stacked/stacked.dart';
import 'package:stacked_services/stacked_services.dart';

import 'show_qr_dialog_model.dart';

class ShowQrDialog extends StackedView<ShowQrDialogModel> {
  final DialogRequest request;
  final Function(DialogResponse) completer;

  const ShowQrDialog({
    Key? key,
    required this.request,
    required this.completer,
  }) : super(key: key);

  @override
  Widget builder(
    BuildContext context,
    ShowQrDialogModel viewModel,
    Widget? child,
  ) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      backgroundColor: Colors.white,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Flexible(
                  child: Text(
                    'Share you code',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                Row(mainAxisSize: MainAxisSize.min, children: [
                  IconButton(
                    onPressed: () => viewModel.shareReferralCode(request.data),
                    icon: const Icon(Icons.ios_share),
                  ),
                  CloseButton(
                      onPressed: () =>
                          completer(DialogResponse(confirmed: false)))
                ]),
              ],
            ),
            QrImageView(
              data: request.data.toString(),
              eyeStyle: QrEyeStyle(
                eyeShape: QrEyeShape.square,
                color: Theme.of(context).colorScheme.primary,
              ),
              dataModuleStyle: QrDataModuleStyle(
                color: Theme.of(context).colorScheme.secondary,
                dataModuleShape: QrDataModuleShape.square,
              ),
              errorStateBuilder: (context, error) => Text(error.toString()),
              embeddedImage: const AssetImage('assets/images/logo-dark.png'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  ShowQrDialogModel viewModelBuilder(BuildContext context) =>
      ShowQrDialogModel();
}

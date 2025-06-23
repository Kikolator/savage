import 'package:flutter/material.dart';
import 'package:stacked/stacked.dart';

import 'sign_up_viewmodel.dart';

class SignUpViewDesktop extends ViewModelWidget<SignUpViewModel> {
  const SignUpViewDesktop({super.key});

  @override
  Widget build(BuildContext context, SignUpViewModel viewModel) {
    return const Scaffold(
      body: Center(
        child: Text(
          'Hello, DESKTOP UI - SignUpView!',
          style: TextStyle(
            fontSize: 35,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }
}

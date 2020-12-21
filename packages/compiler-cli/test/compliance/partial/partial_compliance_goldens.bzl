load("@build_bazel_rules_nodejs//:index.bzl", "generated_file_test", "nodejs_binary", "npm_package_bin")

def partial_compliance_golden(filePath):
    """Creates the generate and testing targets for partial compile results.
    """

    # Remove the "TEST_CASES.json" substring from the end of the provided path.
    path = filePath[:-len("/TEST_CASES.json")]
    generate_partial_name = "generate_partial_for_%s" % path
    data = [
        "//packages/compiler-cli/test/compliance/partial:generate_golden_partial_lib",
        "//packages/compiler-cli/test/compliance/test_cases",
        "//packages/compiler-cli/src/ngtsc/testing/fake_core:npm_package",
    ]

    nodejs_binary(
        name = generate_partial_name,
        testonly = True,
        data = data,
        visibility = [":__pkg__"],
        entry_point = "//packages/compiler-cli/test/compliance/partial:cli.ts",
        templated_args = [
            filePath,
        ],
    )

    nodejs_binary(
        name = generate_partial_name + ".debug",
        testonly = True,
        data = data,
        visibility = [":__pkg__"],
        entry_point = "//packages/compiler-cli/test/compliance/partial:cli.ts",
        templated_args = [
            "--node_options=--inspect-brk",
            filePath,
        ],
    )

    npm_package_bin(
        name = "_generated_%s" % path,
        tool = generate_partial_name,
        testonly = True,
        stdout = "%s/this_file_should_not_be_committed" % path,
        link_workspace_root = True,
        tags = [
            # TODO(josephperrott): Begin running these tests on windows after updating to rules_nodejs 3.0
            "no-windows",
        ],
        visibility = [":__pkg__"],
        data = data,
    )

    generated_file_test(
        visibility = ["//visibility:public"],
        tags = [
            "ivy-only",
            # TODO(josephperrott): Begin running these tests on windows after updating to rules_nodejs 3.0
            "no-windows",
        ],
        name = "%s.golden" % path,
        src = "//packages/compiler-cli/test/compliance/test_cases:%s/GOLDEN_PARTIAL.js" % path,
        generated = "_generated_%s" % path,
    )

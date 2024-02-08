---
layout: post
title: Using xcresult files with GitHub Actions
---
When you run tests in Xcode, the results of the test are saved into an `xcresult` file (actually a folder) somewhere in your Derived Data folder. You can find this result file by going into the Report Navigator in Xcode, right clicking on the top level of your test results and clicking on "Show in Finder". Normally you wouldn't need to look at the file on disk, but you could potentially do something like zip up the file and send it to a coworker to share some test output, or save it somewhere for reference, so it sticks around longer than Xcode would normally keep it. Once you have an `xcresult` file, you can view the test results by double clicking on the file, which opens it in Xcode and allows you to view the test results.

![Test results with context menu showing Show in Finder option](/assets/xcresults-on-github-actions/test-results-show-in-finder.png){: width="300"}

One place this can become very useful is when you have tests that are working fine when you run them on your computer with Xcode, but then fail when you try to run them in your continuous integration (CI) environment. Often, your CI system will provide enough information for you to understand why the test failed, but when it doesn't, you can get some additional information if you can get access to the `xcresult` file.

To demonstrate this, we'll set up a sample project in GitHub Actions and configure it to run the tests, then we'll set it up to save the `xcresult` file.

## The app
To have something to work with, I've created a quick half implemented Recipe app with an initial screen with a list of Recipes, and an add button that goes to a placeholder page. 

![The recipe list](/assets/xcresults-on-github-actions/recipes-list.png){: width="300"}
![Add recipe placeholder page](/assets/xcresults-on-github-actions/add-recipe.png){: width="300"}

To demonstrate some test failures later, I've added a snapshot test to verify the appearance of the app and a UI test to verify some interaction. If you'd like to follow along, you can fork the repo and work from this tag:

<https://github.com/alwold/Recipes/tree/app-with-tests>

We run the tests, and everything passes, hooray!

![Passing tests in Xcode](/assets/xcresults-on-github-actions/passing-tests.png)

## Running the tests in GitHub Actions
To run the tests in GitHub Actions, we'll set up a basic workflow by adding a `.github/workflows` folder at the top level of our repo, and then adding a `test.yml` to the `workflows` folder:

```yaml
name: Run tests
on: workflow_dispatch
jobs:
  test:
    runs-on: macos-13
    steps:
      - uses: actions/checkout@v4
      - run: sudo xcode-select -s /Applications/Xcode_15.2.app
      - run: xcodebuild -project Recipes.xcodeproj -scheme Recipes -sdk iphonesimulator -destination "platform=iOS Simulator,name=iPhone 15,OS=17.2" test
```

Here's how it works:
- The `on:` key is set to `workflow_dispatch` meaning that the job will only run when manually triggered. In a real workflow, you might want to set this up to run whenever a commit is pushed.
- There is one job (`test`) in the workflow, with three steps. We set the `runs-on:` to `macos-13` to run the latest version of macOS, giving us access to Xcode 15.
  - First the code is checked out with the `uses: actions/checkout@v4` line.
  - Next we set the version of Xcode to run by calling `xcode-select`.
  - Finally we run `xcodebuild` to build the project and run the tests. We have to specify the project, scheme, sdk and destination and give it the `test` action to tell it to run tests.

With all of this set up, once we commit the workflow file and push it to our GitHub repo, we should be able to click on the **Actions** tab in the repository and see the **Run tests** workflow.

![GitHub workflows list](/assets/xcresults-on-github-actions/github-workflows.png)

Clicking into the workflow should show us the option to **Run workflow**, since we have the `workflow_dispatch` trigger.

![GitHub workflow view with Run workflow button](/assets/xcresults-on-github-actions/github-run-workflow.png)

So, let's do that, wait for a bit for the tests to run, and see....that the tests have failed. What's up with that?

Looking at the output from the workflow run, we see that the tests failed, but not much more than that.

```
Failing tests:
	RecipesUITests.testAddRecipe()
	RecipesUITests.testAddRecipe()
	RecipesTests.testSnapshot()

** TEST FAILED **

Testing started
Test suite 'RecipesTests' started on 'Clone 1 of iPhone 15 - Recipes (7112)'
Test case 'RecipesTests.testSnapshot()' failed on 'Clone 1 of iPhone 15 - Recipes (7112)' (0.891 seconds)
Test suite 'RecipesUITests' started on 'Clone 2 of iPhone 15 - RecipesUITests-Runner (7115)'
Test case 'RecipesUITests.testAddRecipe()' failed on 'Clone 2 of iPhone 15 - RecipesUITests-Runner (7115)' (41.287 seconds)
```

If we were running the tests locally, we could check out the test report and see image diffs for the snapshot test and detail about the UI test failures, but things were working fine when we ran locally.

## Uploading the `xcresult` file
To get more information about our test failures in CI, we'll set up the GitHub Actions workflow to save the `xcresult` file from our tests as an artifact.

By default, the `xcresult` file gets stored in an obscure folder inside DerivedData, which we can see in the workflow output:
```
Test session results, code coverage, and logs:
	/Users/runner/Library/Developer/Xcode/DerivedData/Recipes-dxmjaqgomvywvobbpqzpdrefmraz/Logs/Test/Test-Recipes-2024.01.30_05-26-33-+0000.xcresult
```
To make things easier on ourselves, we'll modify the `xcodebuild` command to tell it where to save the results from the test by passing the `-resultBundlePath` parameter. 

Once we have it saving in a more predictable place, we'll use the `upload-artifact` task to upload the file to GitHub Actions.

Here's what we end up with:

{% raw %}
```yaml
name: Run tests
on: workflow_dispatch
jobs:
  test:
    runs-on: macos-13
    steps:
      - uses: actions/checkout@v4
      - run: sudo xcode-select -s /Applications/Xcode_15.2.app
      - run: xcodebuild -project Recipes.xcodeproj -scheme Recipes -sdk iphonesimulator -destination "platform=iOS Simulator,name=iPhone 15,OS=17.2" -resultBundlePath Recipes.xcresult test
      - name: Upload xcresult file
        uses: actions/upload-artifact@v4
        if: ${{ failure() }}
        with:
          name: Recipes-${{ github.run_number }}.xcresult
          path: Recipes.xcresult
```
{% endraw %}

Note the `-resultBundlePath Recipes.xcresult` on the `xcodebuild` step and the additional upload step.

By default, if the tests fail, the workflow will stop and skip the remaining steps, so we need to add an `if` key on the upload step to tell it to upload in the case of failure. In this setup, we'll *only* upload it in the case of failure, to save space. You could alternatively save it in all cases by using {% raw %}`if: ${{ always() }}`{% endraw %}.

We also added the run number to the file so you can keep track of which build the results are from once you have the file downloaded.

Now, if we commit, push and run the workflow again, we'll see the `xcresult` file as an artifact on the build. 🎉

![GitHub workflow output with test failure and xcresult artifact](/assets/xcresults-on-github-actions/test-failure-with-artifact.png)

If we download the artifact, unzip it and double click it, it should open in Xcode and we can see the results as if we had run the tests locally. You can [download the results](https://alwold.s3.amazonaws.com/Recipes-7.xcresult.zip) if you'd like to try it yourself without setting up your own build.

The code with the final workflow setup is available here: <https://github.com/alwold/Recipes>

## Finding the issue
Once we have the `xcresult` file loaded up in Xcode, we can start to track down why the tests are failing. Open the test results in Report Navigator and click on the Tests section. 

![The test results](/assets/xcresults-on-github-actions/report-navigator.png)
First, let's take a look at the failing snapshot test. If we double click on the `testSnapshot()` test, we can get additional detail about the failure. Comparing the reference and failure snapshots, we can see that the overall size of the screenshot is different. Aha! We used a different device when running locally (the iPhone SE 3rd generation) vs when we were running in CI (iPhone 15). This should be easy enough to fix; we'll just re-record the snapshots with the iPhone 15.

Next, let's look at the UI test. If we go back to the full test results and double click on the UI test failure, we can see the detail there. For UI tests, we get a full recording of the test, which is really cool. We can see the test is failing when checking for the static text with "Created 1/28/2024, 2:08 PM". If we watch the video, we can see that the actual app is showing a different time (9:08 PM). Aha! As it turns out, the CI is running in a different time zone, so the label has a different value. 

There are two things we should do to fix this. First, we should change the test so it looks for the recipe based on a more stable piece of data, like the name ("Chicken soup"). This would fix this test, but we will still run into problems with the snapshot tests if the time is not consistent. We can control the time zone more carefully by adding a `TZ` environment variable to the scheme, to ensure that the tests always run in a fixed time zone.

## Reading log files
There's one more superpower in `xcresult` files that I'd like to mention. It won't be needed to resolve any of the problems in our example, but it can be very helpful diagnosing other failures.

One of the things that is stored in the `xcresult` file, but not exposed in Xcode (as far as I know) is log files from the app and the tests. Being able to read the output of the log files can be particularly helpful if you run into a crash.

The [`xcparse`](https://github.com/ChargePoint/xcparse) tool can be used to extract the log files from the `xcresult` file, as well as do other cool things (it's worth reading through their README to see what it can do). To install `xcparse`, run:

```bash
brew install chargepoint/xcparse/xcparse
```

Once we have it installed, we can take our `xcresult` file, `Recipes-7.xcresult` and extract the logs like this:

```bash
xcparse logs Recipes-7.xcresult Recipes-7
```
We specify `Recipes-7` as the destination folder, so we can keep track of which `xcresult` file the logs came from. Sometimes you might be extracting logs from several runs during debugging, and it helps to keep the folder names consistent with the `xcresult` file name.

Inside the output folder, there are a ton of files, but here are some of the more interesting ones that might be helpful during debugging:

- `1_Test/Diagnostics/RecipesTests-<long uuid and stuff>/RecipesTests-<long uuid>/StandardOutputAndStandardError.txt` - console output from running the tests
- `1_Test/Diagnostics/RecipesUITests-<long uuid and stuff>/RecipesUITests-<long uuid>/StandardOutputAndStandardError-<bundle id>.txt` - console output from the app during UI testing
- `1_Test/Diagnostics/RecipesUITests-<long uuid and stuff>/RecipesUITests-<long uuid>/StandardOutputAndStandardError.txt` - console output from the UI tests

There's a lot of other interesting data you can poke around in as well. Let me know if you find anything really interesting or helpful.

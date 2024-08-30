---
layout: post
title: Customizing the style of iOS navigation controllers with UINavigationBarAppearance
---
Customizing a `UINavigationBar`'s appearance within a `UINavigationController` has always been a bit of a pain in iOS. In iOS 13, Apple introduced the `UINavigationBarAppearance` class, which provides some more unified mechanisms to customize it. 

First, let's step back and go over some basics. In a `UINavigationController` there is a `UINavigationBar` at the top of the screen, and the top child view controller provides content to show below the navigation bar. There are two general mechanisms to customize properties on the `UINavigationBar`. You can set properties directly on the `UINavigationBar` by accessing the `navigationBar` property of `UINavigationController`, or you can customize the `UINavigationItem` of one of the child view controllers so that the specified style is applied when that view controller is displayed. 

In the below illustration, we you can see 1. style applied to the `UINavigationBar` directly in the `UINavigationController`, 2. what it looks like with a navigation controller pushed, and 3. what it looks like when you customize the style through a view controller's `navigationItem` property.

![Setting up navigation bar](/assets/navigation-bar-appearance/nav-controller-styling.png)

Setting properties directly on the `UINavigationBar` affects the bar regardless of which view controller is displayed.

Setting the properties on `UINavigationItem` only applies while the view controller where the properties are set is displayed. The properties on a `UINavigationItem` will override any set on the `UINavigationBar`, so you can think of the ones on the `UINavigationBar` as defaults that can be overridden by a particular view controller.

Now, getting back to `UINavigationBarAppearance`, there are 4 different properties on `UINavigationBar` and `UINavigationItem` to set the appearance for various scenarios.

The scenarios are broken down by two pieces of state: 
- whether the content is currently scrolled to the top
- whether the navigation bar is compact or not

This table shows when the four different appearance properties are used, based on navigation bar size and scroll state:

||Scrolled to top|Not Scrolled to top|
| ------- | ------- | ------- |
| Standard Size | `scrollEdgeAppearance` | `standardAppearance` |
| Compact size | `compactScrollEdgeAppearance` | `compactAppearance` |

Perhaps somewhat unintuitively, the `standardAppearance` and `compactAppearance` properties are only used when the content is scrolled down, even if a `scrollEdgeAppearance` property is not set.
Also of note is that views that do not support scrolling at all only use the `scrollEdgeAppearance` properties (since they are always at their "edge").

Up until iOS 17, when putting a device in landscape mode, the navigation bar would become compact, like the following:

![A compact navigation bar](/assets/navigation-bar-appearance/compact-nav-bar.png){: width="600" }

Based on my experimentation, it seems like this functionality was removed in iOS 17, but in earlier versions, rotating a device into landscape mode will switch to a compact navigation bar unless you are on a larger device (Max/Plus or higher). Given that `compactScrollEdgeAppearance` is not deprecated (yet), though, it seems like there may be some scenario or future planned scenario where it would still be used in modern versions of iOS. If you know of any such scenarios, please reach out, and I can add some detail.

To give an idea of how this works, here's some code to change the background color for each appearance mode. (the `appearance(with:)` function just creates a new `UINavigationBarAppearance` and sets its `backgroundColor`)

```swift
navigationItem.standardAppearance = appearance(with: .red)
navigationItem.compactAppearance = appearance(with: .blue)
navigationItem.scrollEdgeAppearance = appearance(with: .green)
navigationItem.compactScrollEdgeAppearance = appearance(with: .purple)
```

When we run this code, it looks like this:

![Different UINavigationBarAppearance properties in action](/assets/navigation-bar-appearance/appearance-selection.gif)

One thing I'd like to mention before I wrap up. This (relatively short) post took a lot of experimentation and research. This is an area of UIKit that constantly confuses me, and researching and writing this post helped clear it up a bit in my head. With that in mind, there are two things I'd like to point out. First is that a lot of the stuff you read isn't just knowledge that the writer has at the top of their head, even though it may sound like that is the case. Second is that writing about a topic is a great way to nudge yourself to dive deep enough into a topic to wrap your head around it.

I've only scratched the surface of customizing the navigation bar here, so if there's any other aspects you'd like to read about, let me know!

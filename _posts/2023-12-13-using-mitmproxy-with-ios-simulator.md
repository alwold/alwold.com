---
layout: post
title: Using mitmproxy with the iOS simulator
---
When building an iOS app, it is often useful to be able to observe the traffic that flows between the app and any backend services that it communicates with. This can be especially useful when you start working on an existing app that you aren't already familiar with, especially if it is somewhat complex. There are various ways to observe the traffic, but one of my favorite tools is [mitmproxy](https://mitmproxy.org), a free terminal based tool. If you don't like terminal tools, there are a few graphical options, but they often have a cost associated with them. Here are a few to check out:
- Charles
- Proxyman
- Xcode HTTP instrument (only works on real device)

mitmproxy also has a web interface called mitmweb, which provides a grahical UI, so that may be helpful if you don't like the terminal based interface.

mitmproxy operates as an HTTP proxy, a piece of software that receives HTTP requests, forwards them on to their destination, and forwards back the response. In the process, it allows you to observe and modify the requests and responses.

Using mitmproxy with a real iOS device is pretty straightforward and the documentation covers it pretty well, so we won't go into detail here. Using it with the simulator, though, is a little more tricky. 

### Getting the simulator to use the proxy
Currently, the iOS simulator relies on the macOS system proxy settings to figure out which proxy server to use. With this in mind, every time you want to use mitmproxy, you need to set the proxy for the entire system to use mitmproxy. This presents two problems:
- All of the traffic on the entire machine goes through the proxy, which creates a lot of noise.
- You have to manually enable/disable the proxy whenever you start or stop mitmproxy.

To solve the first problem, it's best to set up mitmproxy to only process traffic to certain hosts. This can be done in the config with the [`allow_hosts`](https://docs.mitmproxy.org/stable/concepts-options/#allow_hosts) option. As an example, if the app I'm building connects to endpoints at https://api.myapp.com in production and https://api.dev.myapp.com in development environments, I might want to observe all of the traffic going to any host ending with `myapp.com`. To do this, add the following lines to `config.yaml` in the `.mitmproxy` directory in your home directory:

```yaml
allow_hosts:
  - '\.myapp.com'
```
With this set up, the proxy will let all traffic that isn't going to hosts in the list pass through without being intercepted or shown in the UI. If you need to add multiple hosts, you can add as many as you want to the list. For example, I might want to also monitor traffic to an analytics service at `myanalyticsprovider.com`:

```yaml
allow_hosts:
  - '\.myapp.com'
  - '\.myanalyticsprovider.com'
```

To solve the second problem, we can put some automation around the enabling/disabling of the proxy. In macOS, we can use a command like this to set the proxy on the command line:
```
networksetup -setwebproxy "Wi-Fi" 127.0.0.1 8080
```
Since we have to specify which "network service" (in this example, it's "Wi-Fi") that we want to set the proxy for, this can get a little complicated if you have multiple network services or if you connect using different interfaces at different times (e.g. wired ethernet in an office, and Wi-Fi in other places).

I do this by creating a script called `mitmproxy.sh`. It configures the system to use the proxy before starting, starts `mitmproxy`, then removes the proxy configuration when `mitmproxy` exits. To account for the potential for varying network services, I call `networksetup -listallnetworkservices`, iterate through the list and set the proxy for each. This sets the proxy on all network services. In some cases, you might not want this, so it might be necessary to modify the script a bit. 

```bash
#!/bin/bash

# the tail command will skip the first line because it's an informational message
interfaces="$(networksetup -listallnetworkservices | tail +2)" 

IFS=$'\n' # split on newlines in the for loops

for interface in $interfaces; do
  echo "Setting proxy on $interface"
  networksetup -setwebproxy "$interface" localhost 8080
  networksetup -setwebproxystate "$interface" on
  networksetup -setsecurewebproxy "$interface" localhost 8080
  networksetup -setsecurewebproxystate "$interface" on
done

mitmproxy

for interface in $interfaces; do
  echo "Disabling proxy on $interface"
  networksetup -setwebproxystate "$interface" off
  networksetup -setsecurewebproxystate "$interface" off
done
```

The final caveat that I should mention is that it seems that the simulator doesn't always pick up changes to the proxy settings right away. It's a good idea to restart the simulator whenever you update proxy settings (i.e. whenever you run the `mitmproxy.sh` script) to make sure it uses the proxy settings. If you don't, you may not be able to see the traffic in mitmproxy.

### Dealing with HTTPS
Another tricky aspect to using mitmproxy with the simulator is intercepting TLS traffic. In order to view or modify HTTPS traffic, mitmproxy needs to make a "fake" certificate for the host whose traffic you are intercepting. Normally, receiving one of these fake certificates will cause iOS to shut down the connection, since it indicates a third party may be intercepting the connection. In our case, we are intentionally creating the fake certificate so that we can monitor the traffic, so we need to tell the simulator to trust these certificates. We can do this with the following command:

```sh
xcrun simctl keychain booted add-root-cert ~/.mitmproxy/mitmproxy-ca-cert.pem
```

In this example, we are telling the simulator to add the certificate in `mitmproxy-ca-cert.pem` to its list of trusted certificates. The "booted" part of the command specifies which simulator device we are adding it to, and is a shorthand for "the currently running simulator". With that in mind, you should start the simulator you are going to run the app on before running this command. You can also specify an explicit device ID (they are in the form of a UUID), like this:

```sh
xcrun simctl keychain 28C798E0-639D-4DAC-B160-0025FCE4E169 add-root-cert ~/.mitmproxy/mitmproxy-ca-cert.pem
```

To figure out the specific device ID of your preferred simulator, use the `xcrun simctl list devices` command.

I've also started work on a script to add the root certificate to all installed simulators, so let me know if that's something that would be helpful.

#### Certificate pinning
Another issue that you may run into with HTTPS is that your app may be doing certificate pinning, which is a mechanism that adds an additional check within the app to make sure that the HTTPS certificate meets certain criteria. If your app has this check, the mitmproxy certificate might be rejected even though iOS says it's ok. This scenario is a little bit trickier to deal with, but generally the approach would be to either set the app up to disable the certificate pinning when running in a simulator/debug builds, or comment it out while you are trying to use mitmproxy.

### Final thoughts
If there are any additional issues that come up for you while using mitmproxy with the simulator, I'd like to hear about them, and maybe add them to the post. Get in touch on Mastodon or send me an email.

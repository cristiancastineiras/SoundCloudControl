# Privacy Policy

## Summary

SoundCloud Control does not collect, store, or transmit any personal data.

## Data stored locally

The extension saves the following preferences exclusively in the user's own browser via `chrome.storage.local`:

| Preference | Purpose |
|---|---|
| UI language | Display the interface in the selected language |
| Theme color | Personalise the popup accent color |
| Compact mode | Toggle the compact strip layout |
| Update interval | Control how often the player state is refreshed |
| Show MP3 download button | Show or hide the optional download button |
| Equalizer settings (preamp & bands) | Persist the user's audio equalizer configuration |

None of this data ever leaves the user's device.

## External network requests

The extension makes the following outbound requests, none of which include personal data:

| Endpoint | Purpose |
|---|---|
| `api-v2.soundcloud.com` | Resolve the streaming URL of the currently playing track (required for MP3 download) |
| `backend1.tioo.eu.org` | Self-hosted audio conversion service — receives only the public SoundCloud track URL to return a downloadable MP3 |
| `api.github.com/repos/…/releases/latest` | Check whether a newer version of the extension is available |

## Data not collected

The extension does **not** collect, process, or share:

- Personal or identifying information
- Health or financial data
- Authentication credentials
- Personal communications
- Location data
- Browsing history
- User activity (clicks, keystrokes, mouse movements)
- Web page content

## Third-party sharing

No user data is sold, transferred, or disclosed to third parties under any circumstances.

## Contact

For any privacy-related questions, please open an issue at:  
[https://github.com/cristiancastineiras/SoundCloudControl/issues](https://github.com/cristiancastineiras/SoundCloudControl/issues)

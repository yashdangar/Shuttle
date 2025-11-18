Fast-forward
 app/(auth)/sign-in/page.tsx        |  24 +++++++-
 app/(auth)/sign-up/page.tsx        |  68 +++++++++++++++++++-
 app/(guest)/dashboard/page.tsx     |   9 +++
 app/(guest)/new-booking/page.tsx   |  92 +++++++++++++++++++++++++++
 app/(guest)/select-hotels/page.tsx | 386 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 app/layout.tsx                     |   5 +-
 app/page.tsx                       |   7 ++-
 lib/hotels.ts                      | 147 ++++++++++++++++++++++++++++++++++++++++++++
 package-lock.json                  |  43 +++++++++++++
 package.json                       |   1 +
 10 files changed, 774 insertions(+), 8 deletions(-)
 create mode 100644 app/(guest)/dashboard/page.tsx
 create mode 100644 app/(guest)/new-booking/page.tsx
 create mode 100644 app/(guest)/select-hotels/page.tsx
 create mode 100644 lib/hotels.ts
~/Documents/Code/shuttle-2 % 
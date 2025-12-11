#ifndef __YOTTA_BUILD_INFO_H__
#define __YOTTA_BUILD_INFO_H__
// yotta build info, #include YOTTA_BUILD_INFO_HEADER to access
#define YOTTA_BUILD_YEAR 2025 // UTC year
#define YOTTA_BUILD_MONTH 12 // UTC month 1-12
#define YOTTA_BUILD_DAY 11 // UTC day 1-31
#define YOTTA_BUILD_HOUR 8 // UTC hour 0-24
#define YOTTA_BUILD_MINUTE 21 // UTC minute 0-59
#define YOTTA_BUILD_SECOND 10 // UTC second 0-61
#define YOTTA_BUILD_UUID 503a651e-b096-4675-abbe-2248e3dfa51b // unique random UUID for each build
#define YOTTA_BUILD_VCS_ID b'5e8a298d73180c5f17db891964487b9305ede06b' // git or mercurial hash
#define YOTTA_BUILD_VCS_CLEAN 0 // evaluates true if the version control system was clean, otherwise false
#define YOTTA_BUILD_VCS_DESCRIPTION b'v2.1.1-16-g5e8a298' // git describe or mercurial equivalent
#endif // ndef __YOTTA_BUILD_INFO_H__

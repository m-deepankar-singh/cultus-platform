Directory structure:
└── google-gemini-live-api-web-console/
    ├── README.md
    ├── app.yaml
    ├── CONTRIBUTING.md
    ├── LICENSE
    ├── package.json
    ├── tsconfig.json
    ├── .gcloudignore
    ├── public/
    │   ├── index.html
    │   └── robots.txt
    ├── readme/
    └── src/
        ├── App.scss
        ├── App.test.tsx
        ├── App.tsx
        ├── index.css
        ├── index.tsx
        ├── react-app-env.d.ts
        ├── reportWebVitals.ts
        ├── setupTests.ts
        ├── types.ts
        ├── components/
        │   ├── altair/
        │   │   └── Altair.tsx
        │   ├── audio-pulse/
        │   │   ├── audio-pulse.scss
        │   │   └── AudioPulse.tsx
        │   ├── control-tray/
        │   │   ├── control-tray.scss
        │   │   └── ControlTray.tsx
        │   ├── logger/
        │   │   ├── logger.scss
        │   │   ├── Logger.tsx
        │   │   └── mock-logs.ts
        │   ├── settings-dialog/
        │   │   ├── ResponseModalitySelector.tsx
        │   │   ├── settings-dialog.scss
        │   │   ├── SettingsDialog.tsx
        │   │   └── VoiceSelector.tsx
        │   └── side-panel/
        │       ├── react-select.scss
        │       ├── side-panel.scss
        │       └── SidePanel.tsx
        ├── contexts/
        │   └── LiveAPIContext.tsx
        ├── hooks/
        │   ├── use-live-api.ts
        │   ├── use-media-stream-mux.ts
        │   ├── use-screen-capture.ts
        │   └── use-webcam.ts
        └── lib/
            ├── audio-recorder.ts
            ├── audio-streamer.ts
            ├── audioworklet-registry.ts
            ├── genai-live-client.ts
            ├── store-logger.ts
            ├── utils.ts
            └── worklets/
                ├── audio-processing.ts
                └── vol-meter.ts


Files Content:

================================================
FILE: README.md
================================================
# Live API - Web Console

This repository contains a react-based starter app for using the [Live API](<[https://ai.google.dev/gemini-api](https://ai.google.dev/api/multimodal-live)>) over a websocket. It provides modules for streaming audio playback, recording user media such as from a microphone, webcam or screen capture as well as a unified log view to aid in development of your application.

[![Live API Demo](readme/thumbnail.png)](https://www.youtube.com/watch?v=J_q7JY1XxFE)

Watch the demo of the Live API [here](https://www.youtube.com/watch?v=J_q7JY1XxFE).

## Usage

To get started, [create a free Gemini API key](https://aistudio.google.com/apikey) and add it to the `.env` file. Then:

```
$ npm install && npm start
```

We have provided several example applications on other branches of this repository:

- [demos/GenExplainer](https://github.com/google-gemini/multimodal-live-api-web-console/tree/demos/genexplainer)
- [demos/GenWeather](https://github.com/google-gemini/multimodal-live-api-web-console/tree/demos/genweather)
- [demos/GenList](https://github.com/google-gemini/multimodal-live-api-web-console/tree/demos/genlist)

## Example

Below is an example of an entire application that will use Google Search grounding and then render graphs using [vega-embed](https://github.com/vega/vega-embed):

```typescript
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

export const declaration: FunctionDeclaration = {
  name: "render_altair",
  description: "Displays an altair graph in json format.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      json_graph: {
        type: SchemaType.STRING,
        description:
          "JSON STRING representation of the graph to render. Must be a string, not a json object",
      },
    },
    required: ["json_graph"],
  },
};

export function Altair() {
  const [jsonString, setJSONString] = useState<string>("");
  const { client, setConfig } = useLiveAPIContext();

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      systemInstruction: {
        parts: [
          {
            text: 'You are my helpful assistant. Any time I ask you for a graph call the "render_altair" function I have provided you. Dont ask for additional information just make your best judgement.',
          },
        ],
      },
      tools: [{ googleSearch: {} }, { functionDeclarations: [declaration] }],
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      console.log(`got toolcall`, toolCall);
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name
      );
      if (fc) {
        const str = (fc.args as any).json_graph;
        setJSONString(str);
      }
    };
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedRef.current && jsonString) {
      vegaEmbed(embedRef.current, JSON.parse(jsonString));
    }
  }, [embedRef, jsonString]);
  return <div className="vega-embed" ref={embedRef} />;
}
```

## development

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
Project consists of:

- an Event-emitting websocket-client to ease communication between the websocket and the front-end
- communication layer for processing audio in and out
- a boilerplate view for starting to build your apps and view logs

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

_This is an experiment showcasing the Live API, not an official Google product. We’ll do our best to support and maintain this experiment but your mileage may vary. We encourage open sourcing projects as a way of learning from each other. Please respect our and other creators' rights, including copyright and trademark rights when present, when sharing these works and creating derivative work. If you want more info on Google's policy, you can find that [here](https://developers.google.com/terms/site-policies)._



================================================
FILE: app.yaml
================================================
# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

runtime: nodejs20
env: standard

handlers:
  # serve static files
  - url: /(.*\..+)$
    static_files: build/\1
    upload: build/(.*\..+)$

  # Catch all handler to index.html
  - url: /.*
    static_files: build/index.html
    secure: always
    redirect_http_response_code: 301
    upload: buid/index.html



================================================
FILE: CONTRIBUTING.md
================================================
# How to contribute

We'd love to accept your patches and contributions to this project.

## Before you begin

### Sign our Contributor License Agreement

Contributions to this project must be accompanied by a
[Contributor License Agreement](https://cla.developers.google.com/about) (CLA).
You (or your employer) retain the copyright to your contribution; this simply
gives us permission to use and redistribute your contributions as part of the
project.

If you or your current employer have already signed the Google CLA (even if it
was for a different project), you probably don't need to do it again.

Visit <https://cla.developers.google.com/> to see your current agreements or to
sign a new one.

### Review our community guidelines

This project follows
[Google's Open Source Community Guidelines](https://opensource.google/conduct/).

## Contribution process

### Code reviews

All submissions, including submissions by project members, require review. We
use GitHub pull requests for this purpose. Consult
[GitHub Help](https://help.github.com/articles/about-pull-requests/) for more
information on using pull requests.



================================================
FILE: LICENSE
================================================

                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright [yyyy] [name of copyright owner]

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.



================================================
FILE: package.json
================================================
{
  "name": "multimodal-live-api-web-console",
  "version": "0.1.0",
  "dependencies": {
    "@google/genai": "^0.14.0",
    "classnames": "^2.5.1",
    "dotenv-flow": "^4.1.0",
    "eventemitter3": "^5.0.1",
    "lodash": "^4.17.21",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-icons": "^5.3.0",
    "react-scripts": "5.0.1",
    "react-select": "^5.8.3",
    "react-syntax-highlighter": "^15.6.1",
    "sass": "^1.80.6",
    "vega": "^5.30.0",
    "vega-embed": "^6.29.0",
    "vega-lite": "^5.22.0",
    "web-vitals": "^2.1.4",
    "zustand": "^5.0.1"
  },
  "scripts": {
    "start-https": "HTTPS=true react-scripts start",
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^5.17.0",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^13.5.0",
    "@types/jest": "^27.5.2",
    "@types/lodash": "^4.17.13",
    "@types/node": "^16.18.119",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/react-syntax-highlighter": "^15.5.13",
    "ts-node": "^10.9.2",
    "typescript": "^5.6.3"
  },
  "overrides": {
    "typescript": "^5.6.3"
  }
}



================================================
FILE: tsconfig.json
================================================
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "src/**/*"],
  "ts-node": {
    "compilerOptions": {
      "module": "commonjs"
    }
  }
}



================================================
FILE: .gcloudignore
================================================
# Ignore everything except app.yaml and the build directory
*
!app.yaml
!build
!build/**


================================================
FILE: public/index.html
================================================
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta
      name="description"
      content="Web site created using create-react-app"
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
      rel="stylesheet"
    />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <!--
      Notice the use of %PUBLIC_URL% in the tags above.
      It will be replaced with the URL of the `public` folder during the build.
      Only files inside the `public` folder can be referenced from the HTML.

      Unlike "/favicon.ico" or "favicon.ico", "%PUBLIC_URL%/favicon.ico" will
      work correctly both with client-side routing and a non-root public URL.
      Learn how to configure a non-root public URL by running `npm run build`.
    -->
    <title>Multimodal Live - Console</title>
  </head>

  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <!--
      This HTML file is a template.
      If you open it directly in the browser, you will see an empty page.

      You can add webfonts, meta tags, or analytics to this file.
      The build step will place the bundled scripts into the <body> tag.

      To begin the development, run `npm start` or `yarn start`.
      To create a production bundle, use `npm run build` or `yarn build`.
    -->
  </body>
</html>



================================================
FILE: public/robots.txt
================================================
# https://www.robotstxt.org/robotstxt.html
User-agent: *
Disallow:




================================================
FILE: src/App.scss
================================================
:root {
  --text: white;
  --gray-200: #b4b8bb;
  --gray-300: #80868b;
  --gray-500: #5f6368;
  --gray-600: #444444;
  --gray-700: #202020;
  --gray-800: #171717;
  --gray-900: #111111;
  --gray-1000: #0a0a0a;
  --border-stroke: #444444;
  --accent-blue: rgb(161, 228, 242);
  --accent-blue-active-bg: #001233;
  --accent-blue-active: #98beff;
  --accent-blue-headers: #448dff;
  --accent-green: rgb(168, 218, 181);

  --midnight-blue: rgb(0, 18, 51);
  --blue-30: #99beff;

  --accent-red: #ff4600;

  --background: var(--gray-900);
  --color: var(--text);

  scrollbar-color: var(--gray-600) var(--gray-900);
  scrollbar-width: thin;

  --font-family: "Space Mono", monospace;

  /* */
  --Neutral-00: #000;
  --Neutral-5: #181a1b;
  --Neutral-10: #1c1f21;
  --Neutral-15: #232729;
  --Neutral-20: #2a2f31;
  --Neutral-30: #404547;
  --Neutral-50: #707577;
  --Neutral-60: #888d8f;
  --Neutral-80: #c3c6c7;
  --Neutral-90: #e1e2e3;

  --Green-500: #0d9c53;
  --Green-700: #025022;

  --Blue-400: #80c1ff;
  --Blue-500: #1f94ff;
  --Blue-800: #0f3557;

  --Red-400: #ff9c7a;
  --Red-500: #ff4600;
  --Red-600: #e03c00;
  --Red-700: #bd3000;
}

body {
  font-family: "Space Mono", monospace;
  background: var(--Neutral-30);
}

.material-symbols-outlined {
  &.filled {
    font-variation-settings:
      "FILL" 1,
      "wght" 400,
      "GRAD" 0,
      "opsz" 24;
  }
}

.space-mono-regular {
  font-family: "Space Mono", monospace;
  font-weight: 400;
  font-style: normal;
}

.space-mono-bold {
  font-family: "Space Mono", monospace;
  font-weight: 700;
  font-style: normal;
}

.space-mono-regular-italic {
  font-family: "Space Mono", monospace;
  font-weight: 400;
  font-style: italic;
}

.space-mono-bold-italic {
  font-family: "Space Mono", monospace;
  font-weight: 700;
  font-style: italic;
}

.hidden {
  display: none;
}

.flex {
  display: flex;
}

.h-screen-full {
  height: 100vh;
}

.w-screen-full {
  width: 100vw;
}

.flex-col {
  flex-direction: column;
}

@media (prefers-reduced-motion: no-preference) {
}

.streaming-console {
  background: var(--Neutral-15);
  color: var(--gray-300);
  display: flex;
  height: 100vh;
  width: 100vw;

  a,
  a:visited,
  a:active {
    color: var(--gray-300);
  }

  .disabled {
    pointer-events: none;

    > * {
      pointer-events: none;
    }
  }

  main {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-grow: 1;
    gap: 1rem;
    max-width: 100%;
    overflow: hidden;
  }

  .main-app-area {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
  }

  .function-call {
    position: absolute;
    top: 0;
    width: 100%;
    height: 50%;
    overflow-y: auto;
  }
}

/* video player */
.stream {
  flex-grow: 1;
  max-width: 90%;
  border-radius: 32px;
  max-height: fit-content;
}



================================================
FILE: src/App.test.tsx
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});



================================================
FILE: src/App.tsx
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useRef, useState } from "react";
import "./App.scss";
import { LiveAPIProvider } from "./contexts/LiveAPIContext";
import SidePanel from "./components/side-panel/SidePanel";
import { Altair } from "./components/altair/Altair";
import ControlTray from "./components/control-tray/ControlTray";
import cn from "classnames";
import { LiveClientOptions } from "./types";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;
if (typeof API_KEY !== "string") {
  throw new Error("set REACT_APP_GEMINI_API_KEY in .env");
}

const apiOptions: LiveClientOptions = {
  apiKey: API_KEY,
};

function App() {
  // this video reference is used for displaying the active stream, whether that is the webcam or screen capture
  // feel free to style as you see fit
  const videoRef = useRef<HTMLVideoElement>(null);
  // either the screen capture, the video or null, if null we hide it
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  return (
    <div className="App">
      <LiveAPIProvider options={apiOptions}>
        <div className="streaming-console">
          <SidePanel />
          <main>
            <div className="main-app-area">
              {/* APP goes here */}
              <Altair />
              <video
                className={cn("stream", {
                  hidden: !videoRef.current || !videoStream,
                })}
                ref={videoRef}
                autoPlay
                playsInline
              />
            </div>

            <ControlTray
              videoRef={videoRef}
              supportsVideo={true}
              onVideoStreamChange={setVideoStream}
              enableEditingSettings={true}
            >
              {/* put your own buttons here */}
            </ControlTray>
          </main>
        </div>
      </LiveAPIProvider>
    </div>
  );
}

export default App;



================================================
FILE: src/index.css
================================================
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}



================================================
FILE: src/index.tsx
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();



================================================
FILE: src/react-app-env.d.ts
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/// <reference types="react-scripts" />



================================================
FILE: src/reportWebVitals.ts
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ReportHandler } from 'web-vitals';

const reportWebVitals = (onPerfEntry?: ReportHandler) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;



================================================
FILE: src/setupTests.ts
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';



================================================
FILE: src/types.ts
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  GoogleGenAIOptions,
  LiveClientToolResponse,
  LiveServerMessage,
  Part,
} from "@google/genai";

/**
 * the options to initiate the client, ensure apiKey is required
 */
export type LiveClientOptions = GoogleGenAIOptions & { apiKey: string };

/** log types */
export type StreamingLog = {
  date: Date;
  type: string;
  count?: number;
  message:
    | string
    | ClientContentLog
    | Omit<LiveServerMessage, "text" | "data">
    | LiveClientToolResponse;
};

export type ClientContentLog = {
  turns: Part[];
  turnComplete: boolean;
};



================================================
FILE: src/components/altair/Altair.tsx
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import {
  FunctionDeclaration,
  LiveServerToolCall,
  Modality,
  Type,
} from "@google/genai";

const declaration: FunctionDeclaration = {
  name: "render_altair",
  description: "Displays an altair graph in json format.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      json_graph: {
        type: Type.STRING,
        description:
          "JSON STRING representation of the graph to render. Must be a string, not a json object",
      },
    },
    required: ["json_graph"],
  },
};

function AltairComponent() {
  const [jsonString, setJSONString] = useState<string>("");
  const { client, setConfig, setModel } = useLiveAPIContext();

  useEffect(() => {
    setModel("models/gemini-2.0-flash-exp");
    setConfig({
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
      },
      systemInstruction: {
        parts: [
          {
            text: 'You are my helpful assistant. Any time I ask you for a graph call the "render_altair" function I have provided you. Dont ask for additional information just make your best judgement.',
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
        { functionDeclarations: [declaration] },
      ],
    });
  }, [setConfig, setModel]);

  useEffect(() => {
    const onToolCall = (toolCall: LiveServerToolCall) => {
      if (!toolCall.functionCalls) {
        return;
      }
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name
      );
      if (fc) {
        const str = (fc.args as any).json_graph;
        setJSONString(str);
      }
      // send data for the response of your tool call
      // in this case Im just saying it was successful
      if (toolCall.functionCalls.length) {
        setTimeout(
          () =>
            client.sendToolResponse({
              functionResponses: toolCall.functionCalls?.map((fc) => ({
                response: { output: { success: true } },
                id: fc.id,
                name: fc.name,
              })),
            }),
          200
        );
      }
    };
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedRef.current && jsonString) {
      console.log("jsonString", jsonString);
      vegaEmbed(embedRef.current, JSON.parse(jsonString));
    }
  }, [embedRef, jsonString]);
  return <div className="vega-embed" ref={embedRef} />;
}

export const Altair = memo(AltairComponent);



================================================
FILE: src/components/audio-pulse/audio-pulse.scss
================================================
.audioPulse {
  display: flex;
  width: 24px;
  justify-content: space-evenly;
  align-items: center;
  transition: all 0.5s;

  & > div {
    background-color: var(--Neutral-30);
    border-radius: 1000px;
    width: 4px;
    min-height: 4px;
    border-radius: 1000px;
    transition: height 0.1s;
  }

  &.hover > div {
    animation: hover 1.4s infinite alternate ease-in-out;
  }

  height: 4px;
  transition: opacity 0.333s;

  &.active {
    opacity: 1;

    & > div {
      background-color: var(--Neutral-80);
    }
  }
}

@keyframes hover {
  from {
    transform: translateY(0);
  }

  to {
    transform: translateY(-3.5px);
  }
}

@keyframes pulse {
  from {
    scale: 1 1;
  }

  to {
    scale: 1.2 1.2;
  }
}



================================================
FILE: src/components/audio-pulse/AudioPulse.tsx
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import "./audio-pulse.scss";
import React from "react";
import { useEffect, useRef } from "react";
import c from "classnames";

const lineCount = 3;

export type AudioPulseProps = {
  active: boolean;
  volume: number;
  hover?: boolean;
};

export default function AudioPulse({ active, volume, hover }: AudioPulseProps) {
  const lines = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    let timeout: number | null = null;
    const update = () => {
      lines.current.forEach(
        (line, i) =>
        (line.style.height = `${Math.min(
          24,
          4 + volume * (i === 1 ? 400 : 60),
        )}px`),
      );
      timeout = window.setTimeout(update, 100);
    };

    update();

    return () => clearTimeout((timeout as number)!);
  }, [volume]);

  return (
    <div className={c("audioPulse", { active, hover })}>
      {Array(lineCount)
        .fill(null)
        .map((_, i) => (
          <div
            key={i}
            ref={(el) => (lines.current[i] = el!)}
            style={{ animationDelay: `${i * 133}ms` }}
          />
        ))}
    </div>
  );
}



================================================
FILE: src/components/control-tray/control-tray.scss
================================================
.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--Neutral-20);
  color: var(--Neutral-60);
  font-size: 1.25rem;
  line-height: 1.75rem;
  text-transform: lowercase;
  cursor: pointer;
  animation: opacity-pulse 3s ease-in infinite;
  transition: all 0.2s ease-in-out;
  width: 48px;
  height: 48px;
  border-radius: 18px;
  border: 1px solid rgba(0, 0, 0, 0);
  user-select: none;
  cursor: pointer;

  &:focus {
    border: 2px solid var(--Neutral-20);
    outline: 2px solid var(--Neutral-80);
  }

  &.outlined {
    background: var(--Neutral-2);
    border: 1px solid var(--Neutral-20);
  }

  .no-action {
    pointer-events: none;
  }

  &:hover {
    background: rgba(0, 0, 0, 0);
    border: 1px solid var(--Neutral-20);
  }

  &.connected {
    background: var(--Blue-800);
    color: var(--Blue-500);

    &:hover {
      border: 1px solid var(--Blue-500);
    }
  }
}

@property --volume {
  syntax: "length";
  inherit: false;
  initial-value: 0px;
}

.disabled .mic-button,
.mic-button.disabled {
  &:before {
    background: rgba(0, 0, 0, 0);
  }
}

.mic-button {
  position: relative;
  background-color: var(--accent-red);
  z-index: 1;
  color: black;
  transition: all 0.2s ease-in;

  &:focus {
    border: 2px solid var(--Neutral-20);
    outline: 2px solid var(--Red-500);
  }

  &:hover {
    background-color: var(--Red-400);
  }

  &:before {
    position: absolute;
    z-index: -1;
    top: calc(var(--volume) * -1);
    left: calc(var(--volume) * -1);
    display: block;
    content: "";
    opacity: 0.35;
    background-color: var(--Red-500);
    width: calc(100% + var(--volume) * 2);
    height: calc(100% + var(--volume) * 2);
    border-radius: 24px;
    transition: all 0.02s ease-in-out;
  }
}

.connect-toggle {
  &:focus {
    border: 2px solid var(--Neutral-20);
    outline: 2px solid var(--Neutral-80);
  }

  &:not(.connected) {
    background-color: var(--Blue-500);
    color: var(--Neutral-5);
  }
}

.control-tray {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 0);
  display: inline-flex;
  justify-content: center;
  align-items: flex-start;
  gap: 8px;
  padding-bottom: 18px;

  .disabled .action-button,
  .action-button.disabled {
    background: rgba(0, 0, 0, 0);
    border: 1px solid var(--Neutral-30, #404547);
    color: var(--Neutral-30);
  }

  .connection-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 4px;

    .connection-button-container {
      border-radius: 27px;
      border: 1px solid var(--Neutral-30);
      background: var(--Neutral-5);
      padding: 10px;
    }

    .text-indicator {
      font-size: 11px;
      color: var(--Blue-500);
      user-select: none;
    }

    &:not(.connected) {
      .text-indicator {
        opacity: 0;
      }
    }
  }
}

.actions-nav {
  background: var(--Neutral-5);
  border: 1px solid var(--Neutral-30);
  border-radius: 27px;
  display: inline-flex;
  gap: 12px;
  align-items: center;
  overflow: clip;
  padding: 10px;

  transition: all 0.6s ease-in;

  &>* {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 1rem;
  }
}

@keyframes opacity-pulse {
  0% {
    opacity: 0.9;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.9;
  }
}



================================================
FILE: src/components/control-tray/ControlTray.tsx
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import cn from "classnames";

import { memo, ReactNode, RefObject, useEffect, useRef, useState } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { UseMediaStreamResult } from "../../hooks/use-media-stream-mux";
import { useScreenCapture } from "../../hooks/use-screen-capture";
import { useWebcam } from "../../hooks/use-webcam";
import { AudioRecorder } from "../../lib/audio-recorder";
import AudioPulse from "../audio-pulse/AudioPulse";
import "./control-tray.scss";
import SettingsDialog from "../settings-dialog/SettingsDialog";

export type ControlTrayProps = {
  videoRef: RefObject<HTMLVideoElement>;
  children?: ReactNode;
  supportsVideo: boolean;
  onVideoStreamChange?: (stream: MediaStream | null) => void;
  enableEditingSettings?: boolean;
};

type MediaStreamButtonProps = {
  isStreaming: boolean;
  onIcon: string;
  offIcon: string;
  start: () => Promise<any>;
  stop: () => any;
};

/**
 * button used for triggering webcam or screen-capture
 */
const MediaStreamButton = memo(
  ({ isStreaming, onIcon, offIcon, start, stop }: MediaStreamButtonProps) =>
    isStreaming ? (
      <button className="action-button" onClick={stop}>
        <span className="material-symbols-outlined">{onIcon}</span>
      </button>
    ) : (
      <button className="action-button" onClick={start}>
        <span className="material-symbols-outlined">{offIcon}</span>
      </button>
    )
);

function ControlTray({
  videoRef,
  children,
  onVideoStreamChange = () => {},
  supportsVideo,
  enableEditingSettings,
}: ControlTrayProps) {
  const videoStreams = [useWebcam(), useScreenCapture()];
  const [activeVideoStream, setActiveVideoStream] =
    useState<MediaStream | null>(null);
  const [webcam, screenCapture] = videoStreams;
  const [inVolume, setInVolume] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  const { client, connected, connect, disconnect, volume } =
    useLiveAPIContext();

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--volume",
      `${Math.max(5, Math.min(inVolume * 200, 8))}px`
    );
  }, [inVolume]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: "audio/pcm;rate=16000",
          data: base64,
        },
      ]);
    };
    if (connected && !muted && audioRecorder) {
      audioRecorder.on("data", onData).on("volume", setInVolume).start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off("data", onData).off("volume", setInVolume);
    };
  }, [connected, client, muted, audioRecorder]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = activeVideoStream;
    }

    let timeoutId = -1;

    function sendVideoFrame() {
      const video = videoRef.current;
      const canvas = renderCanvasRef.current;

      if (!video || !canvas) {
        return;
      }

      const ctx = canvas.getContext("2d")!;
      canvas.width = video.videoWidth * 0.25;
      canvas.height = video.videoHeight * 0.25;
      if (canvas.width + canvas.height > 0) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 1.0);
        const data = base64.slice(base64.indexOf(",") + 1, Infinity);
        client.sendRealtimeInput([{ mimeType: "image/jpeg", data }]);
      }
      if (connected) {
        timeoutId = window.setTimeout(sendVideoFrame, 1000 / 0.5);
      }
    }
    if (connected && activeVideoStream !== null) {
      requestAnimationFrame(sendVideoFrame);
    }
    return () => {
      clearTimeout(timeoutId);
    };
  }, [connected, activeVideoStream, client, videoRef]);

  //handler for swapping from one video-stream to the next
  const changeStreams = (next?: UseMediaStreamResult) => async () => {
    if (next) {
      const mediaStream = await next.start();
      setActiveVideoStream(mediaStream);
      onVideoStreamChange(mediaStream);
    } else {
      setActiveVideoStream(null);
      onVideoStreamChange(null);
    }

    videoStreams.filter((msr) => msr !== next).forEach((msr) => msr.stop());
  };

  return (
    <section className="control-tray">
      <canvas style={{ display: "none" }} ref={renderCanvasRef} />
      <nav className={cn("actions-nav", { disabled: !connected })}>
        <button
          className={cn("action-button mic-button")}
          onClick={() => setMuted(!muted)}
        >
          {!muted ? (
            <span className="material-symbols-outlined filled">mic</span>
          ) : (
            <span className="material-symbols-outlined filled">mic_off</span>
          )}
        </button>

        <div className="action-button no-action outlined">
          <AudioPulse volume={volume} active={connected} hover={false} />
        </div>

        {supportsVideo && (
          <>
            <MediaStreamButton
              isStreaming={screenCapture.isStreaming}
              start={changeStreams(screenCapture)}
              stop={changeStreams()}
              onIcon="cancel_presentation"
              offIcon="present_to_all"
            />
            <MediaStreamButton
              isStreaming={webcam.isStreaming}
              start={changeStreams(webcam)}
              stop={changeStreams()}
              onIcon="videocam_off"
              offIcon="videocam"
            />
          </>
        )}
        {children}
      </nav>

      <div className={cn("connection-container", { connected })}>
        <div className="connection-button-container">
          <button
            ref={connectButtonRef}
            className={cn("action-button connect-toggle", { connected })}
            onClick={connected ? disconnect : connect}
          >
            <span className="material-symbols-outlined filled">
              {connected ? "pause" : "play_arrow"}
            </span>
          </button>
        </div>
        <span className="text-indicator">Streaming</span>
      </div>
      {enableEditingSettings ? <SettingsDialog /> : ""}
    </section>
  );
}

export default memo(ControlTray);



================================================
FILE: src/components/logger/logger.scss
================================================
.logger {
  color: var(--gray-300);
  width: 100%;
  max-width: 100%;
  display: block;

  .logger-list {
    padding: 0 0px 0 25px;
    overflow-x: hidden;
    width: calc(100% - 45px);
  }

  .user h4 {
    color: var(--Green-500);
  }

  .model h4 {
    color: var(--Blue-500);
  }

  .rich-log {
    display: flex;
    justify-content: center;
    gap: 4px;

    pre {
      overflow-x: auto;
    }

    display: block;

    h4 {
      font-size: 14px;
      text-transform: uppercase;
      padding: 8px 0;
      margin: 0;
    }

    h5 {
      margin: 0;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--Neutral-20);
    }

    .part {
      background: var(--Neutral-5);
      padding: 14px;
      margin-bottom: 4px;
      color: var(--Neutral-90);
      border-radius: 8px;
    }
  }

  .plain-log {
    &>* {
      padding-right: 4px;
    }
  }

  .inline-code:not(:last-child) {
    font-style: italic;

    &::after {
      content: ", ";
    }
  }
}

.logger li {
  display: block;
  padding: 8px 0;
  color: var(--Neutral-50, #707577);
  font-family: "Space Mono";
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
}

.logger li .timestamp {
  width: 70px;
  flex-grow: 0;
  flex-shrink: 0;
  color: var(--Neutral-50);
}

.logger li .source {
  flex-shrink: 0;
  font-weight: bold;
}

.logger li.source-server,
.logger li.receive {
  color: var(--Blue-500);
}

.logger li.source-client,
.logger li.send:not(.source-server) {
  color: var(--Green-500);
}

.logger li .count {
  background-color: var(--Neutral-5);
  font-size: x-small;
  padding: 0em 0.6em;
  padding: 0.3em 0.5em;
  line-height: 1em;
  vertical-align: middle;
  border-radius: 8px;
  color: var(--Blue-500);
}

.logger li .message {
  flex-grow: 1;
  color: var(--Neutral-50);
}



================================================
FILE: src/components/logger/Logger.tsx
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import "./logger.scss";

import cn from "classnames";
import { memo, ReactNode } from "react";
import { useLoggerStore } from "../../lib/store-logger";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vs2015 as dark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import {
  ClientContentLog as ClientContentLogType,
  StreamingLog,
} from "../../types";
import {
  Content,
  LiveClientToolResponse,
  LiveServerContent,
  LiveServerToolCall,
  LiveServerToolCallCancellation,
  Part,
} from "@google/genai";

const formatTime = (d: Date) => d.toLocaleTimeString().slice(0, -3);

const LogEntry = memo(
  ({
    log,
    MessageComponent,
  }: {
    log: StreamingLog;
    MessageComponent: ({
      message,
    }: {
      message: StreamingLog["message"];
    }) => ReactNode;
  }): JSX.Element => (
    <li
      className={cn(
        `plain-log`,
        `source-${log.type.slice(0, log.type.indexOf("."))}`,
        {
          receive: log.type.includes("receive"),
          send: log.type.includes("send"),
        }
      )}
    >
      <span className="timestamp">{formatTime(log.date)}</span>
      <span className="source">{log.type}</span>
      <span className="message">
        <MessageComponent message={log.message} />
      </span>
      {log.count && <span className="count">{log.count}</span>}
    </li>
  )
);

const PlainTextMessage = ({
  message,
}: {
  message: StreamingLog["message"];
}) => <span>{message as string}</span>;

type Message = { message: StreamingLog["message"] };

const AnyMessage = ({ message }: Message) => (
  <pre>{JSON.stringify(message, null, "  ")}</pre>
);

function tryParseCodeExecutionResult(output: string) {
  try {
    const json = JSON.parse(output);
    return JSON.stringify(json, null, "  ");
  } catch (e) {
    return output;
  }
}

const RenderPart = memo(({ part }: { part: Part }) => {
  if (part.text && part.text.length) {
    return <p className="part part-text">{part.text}</p>;
  }
  if (part.executableCode) {
    return (
      <div className="part part-executableCode">
        <h5>executableCode: {part.executableCode.language}</h5>
        <SyntaxHighlighter
          language={part.executableCode!.language!.toLowerCase()}
          style={dark}
        >
          {part.executableCode!.code!}
        </SyntaxHighlighter>
      </div>
    );
  }
  if (part.codeExecutionResult) {
    return (
      <div className="part part-codeExecutionResult">
        <h5>codeExecutionResult: {part.codeExecutionResult!.outcome}</h5>
        <SyntaxHighlighter language="json" style={dark}>
          {tryParseCodeExecutionResult(part.codeExecutionResult!.output!)}
        </SyntaxHighlighter>
      </div>
    );
  }
  if (part.inlineData) {
    return (
      <div className="part part-inlinedata">
        <h5>Inline Data: {part.inlineData?.mimeType}</h5>
      </div>
    );
  }
  return <div className="part part-unknown">&nbsp;</div>;
});

const ClientContentLog = memo(({ message }: Message) => {
  const { turns, turnComplete } = message as ClientContentLogType;
  const textParts = turns.filter((part) => !(part.text && part.text === "\n"));
  return (
    <div className="rich-log client-content user">
      <h4 className="roler-user">User</h4>
      <div key={`message-turn`}>
        {textParts.map((part, j) => (
          <RenderPart part={part} key={`message-part-${j}`} />
        ))}
      </div>
      {!turnComplete ? <span>turnComplete: false</span> : ""}
    </div>
  );
});

const ToolCallLog = memo(({ message }: Message) => {
  const { toolCall } = message as { toolCall: LiveServerToolCall };
  return (
    <div className={cn("rich-log tool-call")}>
      {toolCall.functionCalls?.map((fc, i) => (
        <div key={fc.id} className="part part-functioncall">
          <h5>Function call: {fc.name}</h5>
          <SyntaxHighlighter language="json" style={dark}>
            {JSON.stringify(fc, null, "  ")}
          </SyntaxHighlighter>
        </div>
      ))}
    </div>
  );
});

const ToolCallCancellationLog = ({ message }: Message): JSX.Element => (
  <div className={cn("rich-log tool-call-cancellation")}>
    <span>
      {" "}
      ids:{" "}
      {(
        message as { toolCallCancellation: LiveServerToolCallCancellation }
      ).toolCallCancellation.ids?.map((id) => (
        <span className="inline-code" key={`cancel-${id}`}>
          "{id}"
        </span>
      ))}
    </span>
  </div>
);

const ToolResponseLog = memo(
  ({ message }: Message): JSX.Element => (
    <div className={cn("rich-log tool-response")}>
      {(message as LiveClientToolResponse).functionResponses?.map((fc) => (
        <div key={`tool-response-${fc.id}`} className="part">
          <h5>Function Response: {fc.id}</h5>
          <SyntaxHighlighter language="json" style={dark}>
            {JSON.stringify(fc.response, null, "  ")}
          </SyntaxHighlighter>
        </div>
      ))}
    </div>
  )
);

const ModelTurnLog = ({ message }: Message): JSX.Element => {
  const serverContent = (message as { serverContent: LiveServerContent })
    .serverContent;
  const { modelTurn } = serverContent as { modelTurn: Content };
  const { parts } = modelTurn;

  return (
    <div className="rich-log model-turn model">
      <h4 className="role-model">Model</h4>
      {parts
        ?.filter((part) => !(part.text && part.text === "\n"))
        .map((part, j) => (
          <RenderPart part={part} key={`model-turn-part-${j}`} />
        ))}
    </div>
  );
};

const CustomPlainTextLog = (msg: string) => () =>
  <PlainTextMessage message={msg} />;

export type LoggerFilterType = "conversations" | "tools" | "none";

export type LoggerProps = {
  filter: LoggerFilterType;
};

const filters: Record<LoggerFilterType, (log: StreamingLog) => boolean> = {
  tools: (log: StreamingLog) =>
    typeof log.message === "object" &&
    ("toolCall" in log.message ||
      "functionResponses" in log.message ||
      "toolCallCancellation" in log.message),
  conversations: (log: StreamingLog) =>
    typeof log.message === "object" &&
    (("turns" in log.message && "turnComplete" in log.message) ||
      "serverContent" in log.message),
  none: () => true,
};

const component = (log: StreamingLog) => {
  if (typeof log.message === "string") {
    return PlainTextMessage;
  }
  if ("turns" in log.message && "turnComplete" in log.message) {
    return ClientContentLog;
  }
  if ("toolCall" in log.message) {
    return ToolCallLog;
  }
  if ("toolCallCancellation" in log.message) {
    return ToolCallCancellationLog;
  }
  if ("functionResponses" in log.message) {
    return ToolResponseLog;
  }
  if ("serverContent" in log.message) {
    const { serverContent } = log.message;
    if (serverContent?.interrupted) {
      return CustomPlainTextLog("interrupted");
    }
    if (serverContent?.turnComplete) {
      return CustomPlainTextLog("turnComplete");
    }
    if (serverContent && "modelTurn" in serverContent) {
      return ModelTurnLog;
    }
  }
  return AnyMessage;
};

export default function Logger({ filter = "none" }: LoggerProps) {
  const { logs } = useLoggerStore();

  const filterFn = filters[filter];

  return (
    <div className="logger">
      <ul className="logger-list">
        {logs.filter(filterFn).map((log, key) => {
          return (
            <LogEntry MessageComponent={component(log)} log={log} key={key} />
          );
        })}
      </ul>
    </div>
  );
}



================================================
FILE: src/components/logger/mock-logs.ts
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * this module is just mock data, intended to make it easier to develop and style the logger
 */
import type { StreamingLog } from "../../types";

const soundLogs = (n: number): StreamingLog[] =>
  new Array(n).fill(0).map(
    (): StreamingLog => ({
      date: new Date(),
      type: "server.audio",
      message: "buffer (11250)",
    })
  );
//
const realtimeLogs = (n: number): StreamingLog[] =>
  new Array(n).fill(0).map(
    (): StreamingLog => ({
      date: new Date(),
      type: "client.realtimeInput",
      message: "audio",
    })
  );

export const mockLogs: StreamingLog[] = [
  {
    date: new Date(),
    type: "client.open",
    message: "connected",
  },
  { date: new Date(), type: "receive", message: "setupComplete" },
  ...realtimeLogs(10),
  ...soundLogs(10),
  {
    date: new Date(),
    type: "receive.content",
    message: {
      serverContent: {
        interrupted: true,
      },
    },
  },
  {
    date: new Date(),
    type: "receive.content",
    message: {
      serverContent: {
        turnComplete: true,
      },
    },
  },
  //this one is just a string
  // {
  //   date: new Date(),
  //   type: "server.send",
  //   message: {
  //     serverContent: {
  //       turnComplete: true,
  //     },
  //   },
  // },
  ...realtimeLogs(10),
  ...soundLogs(20),
  {
    date: new Date(),
    type: "receive.content",
    message: {
      serverContent: {
        modelTurn: {
          parts: [{ text: "Hey its text" }, { text: "more" }],
        },
      },
    },
  },
  {
    date: new Date(),
    type: "client.send",
    message: {
      turns: [
        {
          text: "How much wood could a woodchuck chuck if a woodchuck could chuck wood",
        },
        {
          text: "more text",
        },
      ],
      turnComplete: false,
    },
  },
  {
    date: new Date(),
    type: "server.toolCall",
    message: {
      toolCall: {
        functionCalls: [
          {
            id: "akadjlasdfla-askls",
            name: "take_photo",
            args: {},
          },
          {
            id: "akldjsjskldsj-102",
            name: "move_camera",
            args: { x: 20, y: 4 },
          },
        ],
      },
    },
  },
  {
    date: new Date(),
    type: "server.toolCallCancellation",
    message: {
      toolCallCancellation: {
        ids: ["akladfjadslfk", "adkafsdljfsdk"],
      },
    },
  },
  {
    date: new Date(),
    type: "client.toolResponse",
    message: {
      functionResponses: [
        {
          response: { success: true },
          id: "akslaj-10102",
        },
      ],
    },
  },
  {
    date: new Date(),
    type: "receive.serverContent",
    message: "interrupted",
  },
  {
    date: new Date(),
    type: "receive.serverContent",
    message: "turnComplete",
  },
];



================================================
FILE: src/components/settings-dialog/ResponseModalitySelector.tsx
================================================
import { useCallback, useState } from "react";
import Select from "react-select";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { Modality } from "@google/genai";

const responseOptions = [
  { value: "audio", label: "audio" },
  { value: "text", label: "text" },
];

export default function ResponseModalitySelector() {
  const { config, setConfig } = useLiveAPIContext();

  const [selectedOption, setSelectedOption] = useState<{
    value: string;
    label: string;
  } | null>(responseOptions[0]);

  const updateConfig = useCallback(
    (modality: "audio" | "text") => {
      setConfig({
        ...config,
        responseModalities: [
          modality === "audio" ? Modality.AUDIO : Modality.TEXT,
        ],
      });
    },
    [config, setConfig]
  );

  return (
    <div className="select-group">
      <label htmlFor="response-modality-selector">Response modality</label>
      <Select
        id="response-modality-selector"
        className="react-select"
        classNamePrefix="react-select"
        styles={{
          control: (baseStyles) => ({
            ...baseStyles,
            background: "var(--Neutral-15)",
            color: "var(--Neutral-90)",
            minHeight: "33px",
            maxHeight: "33px",
            border: 0,
          }),
          option: (styles, { isFocused, isSelected }) => ({
            ...styles,
            backgroundColor: isFocused
              ? "var(--Neutral-30)"
              : isSelected
              ? "var(--Neutral-20)"
              : undefined,
          }),
        }}
        defaultValue={selectedOption}
        options={responseOptions}
        onChange={(e) => {
          setSelectedOption(e);
          if (e && (e.value === "audio" || e.value === "text")) {
            updateConfig(e.value);
          }
        }}
      />
    </div>
  );
}



================================================
FILE: src/components/settings-dialog/settings-dialog.scss
================================================
.select-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: 70px;
  & > label {
    font-size: 10px;
  }
}

.settings-dialog {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 70px;

  .connected-indicator {
    font-style: italic;
  }

  /*.connected-indicator {
    &:before {
      position: absolute;
      top: 0;
      left: 0;
      z-index: 0;
      display: block;
      content: "";
      width: 100%;
      height: 100%;
      background-color: var(--Neutral-5);
      opacity: 0.85;
    }
    z-index: 1;
    
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 500;
    color: var(--Neutral-80);

    p {
      z-index: 1;
    }
  }*/

  h4 {
    margin-left: 4px;
    margin-bottom: 10px;
  }

  button {
    background: none;
    border: 0;
  }

  .dialog {
    font-family: "Space mono";
    background: var(--Neutral-5);
    border-radius: 18px;
    color: var(--Neutral-80);
    border: 0;
    padding: 0;
    margin: 0;
    position: fixed;
    top: -400px;
    right: 0;
    width: 696px;
    height: 593px;
    transform: translate(-25%, -50%);
  }

  .dialog-container {
    box-sizing: border-box;
    padding: 32px;
    max-height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .small {
    font-size: 80%;
  }

  .mode-selectors {
    display: flex;
    gap: 1rem;
    padding: 8px 0;
  }

  textarea.system {
    border-radius: 12px;
    background-color: var(--Neutral-15);
    color: var(--Neutral-80);
    margin-top: 8px;
    font-family:
      Google Sans,
      sans-serif;
    line-height: 21px;
    font-size: 16px;
    field-sizing: content;
    width: calc(100% - 16px);
    min-height: 150px;
    height: 150px;
    padding: 8px;
    border: 0;
    resize: vertical;
    box-sizing: border-box;
  }

  .function-declarations {
    font-size: 66%;
    width: 100%;
    /* Enables vertical scrolling */
  }

  .fd-rows {
    display: grid;
    grid-template-columns: 1fr 0.5fr 1.5fr;
    row-gap: 6px;
    /* Three columns, last one takes remaining space */
  }

  .fd-row-name {
    font-family: "Space mono";
    font-size: 12px;
    font-weight: bold;
    color: var(--Blue-400);
    font-weight: bold;
    border-radius: 8px;
    border: 1px solid var(--Neutral-20, #2a2f31);
    padding: 10px;
  }

  .fd-row-args {
    padding: 12px;
  }

  .fd-row-args > *:not(:last-child)::after {
    content: ", ";
  }

  .fd-row {
    display: contents;
    color: var(--Neutral-70);
    /* Make data-row participate in the grid layout of data-rows, without being an additional grid row */
    align-items: center;
    /* Vertically center the content of the row */
    /* Bottom border for each row */
    height: 35px;
    /* The row height */
  }

  .fd-row-description {
    flex: 1;
    background: transparent;
    border: none;
    color: inherit;
    font-size: inherit;
    padding: 2px 4px;

    &:hover,
    &:focus {
      background: var(--Neutral-20);
      outline: none;
    }
  }
}



================================================
FILE: src/components/settings-dialog/SettingsDialog.tsx
================================================
import {
  ChangeEvent,
  FormEventHandler,
  useCallback,
  useMemo,
  useState,
} from "react";
import "./settings-dialog.scss";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import VoiceSelector from "./VoiceSelector";
import ResponseModalitySelector from "./ResponseModalitySelector";
import { FunctionDeclaration, LiveConnectConfig, Tool } from "@google/genai";

type FunctionDeclarationsTool = Tool & {
  functionDeclarations: FunctionDeclaration[];
};

export default function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const { config, setConfig, connected } = useLiveAPIContext();
  const functionDeclarations: FunctionDeclaration[] = useMemo(() => {
    if (!Array.isArray(config.tools)) {
      return [];
    }
    return (config.tools as Tool[])
      .filter((t: Tool): t is FunctionDeclarationsTool =>
        Array.isArray((t as any).functionDeclarations)
      )
      .map((t) => t.functionDeclarations)
      .filter((fc) => !!fc)
      .flat();
  }, [config]);

  // system instructions can come in many types
  const systemInstruction = useMemo(() => {
    if (!config.systemInstruction) {
      return "";
    }
    if (typeof config.systemInstruction === "string") {
      return config.systemInstruction;
    }
    if (Array.isArray(config.systemInstruction)) {
      return config.systemInstruction
        .map((p) => (typeof p === "string" ? p : p.text))
        .join("\n");
    }
    if (
      typeof config.systemInstruction === "object" &&
      "parts" in config.systemInstruction
    ) {
      return (
        config.systemInstruction.parts?.map((p) => p.text).join("\n") || ""
      );
    }
    return "";
  }, [config]);

  const updateConfig: FormEventHandler<HTMLTextAreaElement> = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const newConfig: LiveConnectConfig = {
        ...config,
        systemInstruction: event.target.value,
      };
      setConfig(newConfig);
    },
    [config, setConfig]
  );

  const updateFunctionDescription = useCallback(
    (editedFdName: string, newDescription: string) => {
      const newConfig: LiveConnectConfig = {
        ...config,
        tools:
          config.tools?.map((tool) => {
            const fdTool = tool as FunctionDeclarationsTool;
            if (!Array.isArray(fdTool.functionDeclarations)) {
              return tool;
            }
            return {
              ...tool,
              functionDeclarations: fdTool.functionDeclarations.map((fd) =>
                fd.name === editedFdName
                  ? { ...fd, description: newDescription }
                  : fd
              ),
            };
          }) || [],
      };
      setConfig(newConfig);
    },
    [config, setConfig]
  );

  return (
    <div className="settings-dialog">
      <button
        className="action-button material-symbols-outlined"
        onClick={() => setOpen(!open)}
      >
        settings
      </button>
      <dialog className="dialog" style={{ display: open ? "block" : "none" }}>
        <div className={`dialog-container ${connected ? "disabled" : ""}`}>
          {connected && (
            <div className="connected-indicator">
              <p>
                These settings can only be applied before connecting and will
                override other settings.
              </p>
            </div>
          )}
          <div className="mode-selectors">
            <ResponseModalitySelector />
            <VoiceSelector />
          </div>

          <h3>System Instructions</h3>
          <textarea
            className="system"
            onChange={updateConfig}
            value={systemInstruction}
          />
          <h4>Function declarations</h4>
          <div className="function-declarations">
            <div className="fd-rows">
              {functionDeclarations.map((fd, fdKey) => (
                <div className="fd-row" key={`function-${fdKey}`}>
                  <span className="fd-row-name">{fd.name}</span>
                  <span className="fd-row-args">
                    {Object.keys(fd.parameters?.properties || {}).map(
                      (item, k) => (
                        <span key={k}>{item}</span>
                      )
                    )}
                  </span>
                  <input
                    key={`fd-${fd.description}`}
                    className="fd-row-description"
                    type="text"
                    defaultValue={fd.description}
                    onBlur={(e) =>
                      updateFunctionDescription(fd.name!, e.target.value)
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
}



================================================
FILE: src/components/settings-dialog/VoiceSelector.tsx
================================================
import { useCallback, useEffect, useState } from "react";
import Select from "react-select";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

const voiceOptions = [
  { value: "Puck", label: "Puck" },
  { value: "Charon", label: "Charon" },
  { value: "Kore", label: "Kore" },
  { value: "Fenrir", label: "Fenrir" },
  { value: "Aoede", label: "Aoede" },
];

export default function VoiceSelector() {
  const { config, setConfig } = useLiveAPIContext();

  useEffect(() => {
    const voiceName =
      config.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName ||
      "Atari02";
    const voiceOption = { value: voiceName, label: voiceName };
    setSelectedOption(voiceOption);
  }, [config]);

  const [selectedOption, setSelectedOption] = useState<{
    value: string;
    label: string;
  } | null>(voiceOptions[5]);

  const updateConfig = useCallback(
    (voiceName: string) => {
      setConfig({
        ...config,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName,
            },
          },
        },
      });
    },
    [config, setConfig]
  );

  return (
    <div className="select-group">
      <label htmlFor="voice-selector">Voice</label>
      <Select
        id="voice-selector"
        className="react-select"
        classNamePrefix="react-select"
        styles={{
          control: (baseStyles) => ({
            ...baseStyles,
            background: "var(--Neutral-15)",
            color: "var(--Neutral-90)",
            minHeight: "33px",
            maxHeight: "33px",
            border: 0,
          }),
          option: (styles, { isFocused, isSelected }) => ({
            ...styles,
            backgroundColor: isFocused
              ? "var(--Neutral-30)"
              : isSelected
              ? "var(--Neutral-20)"
              : undefined,
          }),
        }}
        value={selectedOption}
        defaultValue={selectedOption}
        options={voiceOptions}
        onChange={(e) => {
          setSelectedOption(e);
          if (e) {
            updateConfig(e.value);
          }
        }}
      />
    </div>
  );
}



================================================
FILE: src/components/side-panel/react-select.scss
================================================
.react-select {
  background: var(--Neutral-20);
  color: var(--Neutral-90);
  width: 193px;
  height: 30px;

  .react-select__single-value {
    color: var(--Neutral-90);
  }

  .react-select__menu {
    background: var(--Neutral-20);
    color: var(--Neutral-90);
  }

  .react-select__option {
  }

  .react-select__value-container {
  }

  .react-select__indicators {
  }

  .react-select__option:hover,
  .react-select__option:focus,
  .react-select_option:focus-within {
    background: var(--Neutral-30);
  }

  .react-select__option--is-focused: {
    background: var(--Neutral-30);
  }
}



================================================
FILE: src/components/side-panel/side-panel.scss
================================================
.side-panel {
  background: var(--Neutral-00);
  width: 40px;
  /* when closed */
  display: flex;
  flex-direction: column;
  height: 100vh;
  transition: all 0.2s ease-in;
  font-family: Arial, sans-serif;
  border-right: 1px solid var(--gray-600);
  color: var(--Neutral-90, #e1e2e3);
  font-family: var(--font-family);
  font-size: 13px;
  font-style: normal;
  font-weight: 400;
  line-height: 160%;
  /* 20.8px */

  .hidden {
    display: none !important;
  }

  &.open {
    .top {
      h2 {
        left: 0%;
        display: block;
        opacity: 1;
      }
    }
  }

  .top {
    display: flex;
    width: calc(100% - 45px);
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px 12px 25px;
    border-bottom: 1px solid var(--Neutral-20);

    h2 {
      position: relative;
      color: var(--Neutral-90, #e1e2e3);
      font-family: "Google Sans";
      font-size: 21px;
      font-style: normal;
      font-weight: 500;
      line-height: 16px;
      /* 100% */

      opacity: 0;
      display: none;
      left: -100%;
      transition:
        opacity 0.2s ease-in,
        left 0.2s ease-in,
        display 0.2s ease-in;
      transition-behavior: allow-discrete;

      @starting-style {
        left: 0%;
        opacity: 1;
      }
    }
  }

  .opener {
    height: 30px;
    transition: transform 0.2s ease-in;
  }

  &:not(.open) {
    .side-panel-container {
      opacity: 0;
      display: none;
      transition: all 0.2s ease-in allow-discrete;
      transition-delay: 0.1s;
    }

    .indicators .streaming-indicator {
      width: 30px;
      opacity: 0;
    }

    .opener {
      transform: translate(-50%, 0);
    }

    .input-container {
      opacity: 0;
      display: none;
      transition: all 0.2s ease-in allow-discrete;
    }
  }

  .indicators {
    display: flex;
    padding: 24px 25px;
    justify-content: flex-end;
    gap: 21px;

    .streaming-indicator {
      user-select: none;
      border-radius: 4px;
      border: 1px solid var(--Neutral-20, #2a2f31);
      background: var(--Neutral-10, #1c1f21);
      display: flex;
      width: 136px;
      height: 30px;
      padding-left: 4px;
      justify-content: center;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
      text-align: center;
      font-family: "Space Mono";
      font-size: 14px;
      font-style: normal;
      font-weight: 400;
      line-height: normal;
      transition: width 0.2s ease-in;

      &.connected {
        color: var(--Blue-500, #0d9c53);
      }
    }
  }

  .side-panel-container {
    align-self: flex-end;
    width: 400px;
    flex-grow: 1;
    overflow-x: hidden;
    overflow-y: auto;
    /*scrollbar-gutter: stable both-edges;*/
  }

  .input-container {
    height: 50px;
    flex-grow: 0;
    flex-shrink: 0;
    border-top: 1px solid var(--Neutral-20);
    padding: 14px 25px;
    overflow: hidden;

    .input-content {
      position: relative;
      background: var(--Neutral-10);
      border: 1px solid var(--Neutral-15);
      height: 22px;
      border-radius: 10px;
      padding: 11px 18px;

      .send-button {
        position: absolute;
        top: 50%;
        right: 0;
        transform: translate(0, -50%);
        background: none;
        border: 0;
        color: var(--Neutral-20);
        cursor: pointer;
        transition: color 0.1s ease-in;
        z-index: 2;

        &:hover {
          color: var(--Neutral-60);
        }
      }

      .input-area {
        background: none;
        color: var(--Neutral-90);
        field-sizing: content;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 2;
        display: inline-block;
        width: calc(100% - 72px);
        max-height: 20px;
        outline: none;
        --webkit-box-flex: 1;
        flex: 1;
        word-break: break-word;
        overflow: auto;
        padding: 14px 18px;
        border: 0;
        resize: none;
      }

      .input-content-placeholder {
        position: absolute;
        left: 0;
        top: 0;
        display: flex;
        align-items: center;
        z-index: 1;
        height: 100%;
        width: 100%;
        pointer-events: none;
        user-select: none;
        padding: 0px 18px;
        white-space: pre-wrap;
      }
    }
  }
}

.side-panel.open {
  width: 400px;
  height: 100vh;
}

.side-panel-responses,
.side-panel-requests {
  flex-grow: 1;
  flex-shrink: 1;
  overflow-x: hidden;
  overflow-y: auto;
  width: 100%;
  display: block;
  margin-left: 8px;
}

.top {
  width: 100%;
  flex-grow: 0;
  flex-shrink: 0;
  height: 30px;
  display: flex;
  align-self: flex-end;
  align-items: center;
  transition: all 0.2s ease-in;
}

.top button {
  background: transparent;
  border: 0;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1.75rem;
  padding: 4px;
}



================================================
FILE: src/components/side-panel/SidePanel.tsx
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import "./react-select.scss";
import cn from "classnames";
import { useEffect, useRef, useState } from "react";
import { RiSidebarFoldLine, RiSidebarUnfoldLine } from "react-icons/ri";
import Select from "react-select";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { useLoggerStore } from "../../lib/store-logger";
import Logger, { LoggerFilterType } from "../logger/Logger";
import "./side-panel.scss";

const filterOptions = [
  { value: "conversations", label: "Conversations" },
  { value: "tools", label: "Tool Use" },
  { value: "none", label: "All" },
];

export default function SidePanel() {
  const { connected, client } = useLiveAPIContext();
  const [open, setOpen] = useState(true);
  const loggerRef = useRef<HTMLDivElement>(null);
  const loggerLastHeightRef = useRef<number>(-1);
  const { log, logs } = useLoggerStore();

  const [textInput, setTextInput] = useState("");
  const [selectedOption, setSelectedOption] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  //scroll the log to the bottom when new logs come in
  useEffect(() => {
    if (loggerRef.current) {
      const el = loggerRef.current;
      const scrollHeight = el.scrollHeight;
      if (scrollHeight !== loggerLastHeightRef.current) {
        el.scrollTop = scrollHeight;
        loggerLastHeightRef.current = scrollHeight;
      }
    }
  }, [logs]);

  // listen for log events and store them
  useEffect(() => {
    client.on("log", log);
    return () => {
      client.off("log", log);
    };
  }, [client, log]);

  const handleSubmit = () => {
    client.send([{ text: textInput }]);

    setTextInput("");
    if (inputRef.current) {
      inputRef.current.innerText = "";
    }
  };

  return (
    <div className={`side-panel ${open ? "open" : ""}`}>
      <header className="top">
        <h2>Console</h2>
        {open ? (
          <button className="opener" onClick={() => setOpen(false)}>
            <RiSidebarFoldLine color="#b4b8bb" />
          </button>
        ) : (
          <button className="opener" onClick={() => setOpen(true)}>
            <RiSidebarUnfoldLine color="#b4b8bb" />
          </button>
        )}
      </header>
      <section className="indicators">
        <Select
          className="react-select"
          classNamePrefix="react-select"
          styles={{
            control: (baseStyles) => ({
              ...baseStyles,
              background: "var(--Neutral-15)",
              color: "var(--Neutral-90)",
              minHeight: "33px",
              maxHeight: "33px",
              border: 0,
            }),
            option: (styles, { isFocused, isSelected }) => ({
              ...styles,
              backgroundColor: isFocused
                ? "var(--Neutral-30)"
                : isSelected
                  ? "var(--Neutral-20)"
                  : undefined,
            }),
          }}
          defaultValue={selectedOption}
          options={filterOptions}
          onChange={(e) => {
            setSelectedOption(e);
          }}
        />
        <div className={cn("streaming-indicator", { connected })}>
          {connected
            ? `🔵${open ? " Streaming" : ""}`
            : `⏸️${open ? " Paused" : ""}`}
        </div>
      </section>
      <div className="side-panel-container" ref={loggerRef}>
        <Logger
          filter={(selectedOption?.value as LoggerFilterType) || "none"}
        />
      </div>
      <div className={cn("input-container", { disabled: !connected })}>
        <div className="input-content">
          <textarea
            className="input-area"
            ref={inputRef}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit();
              }
            }}
            onChange={(e) => setTextInput(e.target.value)}
            value={textInput}
          ></textarea>
          <span
            className={cn("input-content-placeholder", {
              hidden: textInput.length,
            })}
          >
            Type&nbsp;something...
          </span>

          <button
            className="send-button material-symbols-outlined filled"
            onClick={handleSubmit}
          >
            send
          </button>
        </div>
      </div>
    </div>
  );
}



================================================
FILE: src/contexts/LiveAPIContext.tsx
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createContext, FC, ReactNode, useContext } from "react";
import { useLiveAPI, UseLiveAPIResults } from "../hooks/use-live-api";
import { LiveClientOptions } from "../types";

const LiveAPIContext = createContext<UseLiveAPIResults | undefined>(undefined);

export type LiveAPIProviderProps = {
  children: ReactNode;
  options: LiveClientOptions;
};

export const LiveAPIProvider: FC<LiveAPIProviderProps> = ({
  options,
  children,
}) => {
  const liveAPI = useLiveAPI(options);

  return (
    <LiveAPIContext.Provider value={liveAPI}>
      {children}
    </LiveAPIContext.Provider>
  );
};

export const useLiveAPIContext = () => {
  const context = useContext(LiveAPIContext);
  if (!context) {
    throw new Error("useLiveAPIContext must be used wihin a LiveAPIProvider");
  }
  return context;
};



================================================
FILE: src/hooks/use-live-api.ts
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GenAILiveClient } from "../lib/genai-live-client";
import { LiveClientOptions } from "../types";
import { AudioStreamer } from "../lib/audio-streamer";
import { audioContext } from "../lib/utils";
import VolMeterWorket from "../lib/worklets/vol-meter";
import { LiveConnectConfig } from "@google/genai";

export type UseLiveAPIResults = {
  client: GenAILiveClient;
  setConfig: (config: LiveConnectConfig) => void;
  config: LiveConnectConfig;
  model: string;
  setModel: (model: string) => void;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  volume: number;
};

export function useLiveAPI(options: LiveClientOptions): UseLiveAPIResults {
  const client = useMemo(() => new GenAILiveClient(options), [options]);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [model, setModel] = useState<string>("models/gemini-2.0-flash-exp");
  const [config, setConfig] = useState<LiveConnectConfig>({});
  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(0);

  // register audio for streaming server -> speakers
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: "audio-out" }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        audioStreamerRef.current
          .addWorklet<any>("vumeter-out", VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .then(() => {
            // Successfully added worklet
          });
      });
    }
  }, [audioStreamerRef]);

  useEffect(() => {
    const onOpen = () => {
      setConnected(true);
    };

    const onClose = () => {
      setConnected(false);
    };

    const onError = (error: ErrorEvent) => {
      console.error("error", error);
    };

    const stopAudioStreamer = () => audioStreamerRef.current?.stop();

    const onAudio = (data: ArrayBuffer) =>
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));

    client
      .on("error", onError)
      .on("open", onOpen)
      .on("close", onClose)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio);

    return () => {
      client
        .off("error", onError)
        .off("open", onOpen)
        .off("close", onClose)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio)
        .disconnect();
    };
  }, [client]);

  const connect = useCallback(async () => {
    if (!config) {
      throw new Error("config has not been set");
    }
    client.disconnect();
    await client.connect(model, config);
  }, [client, config, model]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  return {
    client,
    config,
    setConfig,
    model,
    setModel,
    connected,
    connect,
    disconnect,
    volume,
  };
}



================================================
FILE: src/hooks/use-media-stream-mux.ts
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type UseMediaStreamResult = {
  type: "webcam" | "screen";
  start: () => Promise<MediaStream>;
  stop: () => void;
  isStreaming: boolean;
  stream: MediaStream | null;
};



================================================
FILE: src/hooks/use-screen-capture.ts
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useState, useEffect } from "react";
import { UseMediaStreamResult } from "./use-media-stream-mux";

export function useScreenCapture(): UseMediaStreamResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    const handleStreamEnded = () => {
      setIsStreaming(false);
      setStream(null);
    };
    if (stream) {
      stream
        .getTracks()
        .forEach((track) => track.addEventListener("ended", handleStreamEnded));
      return () => {
        stream
          .getTracks()
          .forEach((track) =>
            track.removeEventListener("ended", handleStreamEnded),
          );
      };
    }
  }, [stream]);

  const start = async () => {
    // const controller = new CaptureController();
    // controller.setFocusBehavior("no-focus-change");
    const mediaStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      // controller
    });
    setStream(mediaStream);
    setIsStreaming(true);
    return mediaStream;
  };

  const stop = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsStreaming(false);
    }
  };

  const result: UseMediaStreamResult = {
    type: "screen",
    start,
    stop,
    isStreaming,
    stream,
  };

  return result;
}



================================================
FILE: src/hooks/use-webcam.ts
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useState, useEffect } from "react";
import { UseMediaStreamResult } from "./use-media-stream-mux";

export function useWebcam(): UseMediaStreamResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    const handleStreamEnded = () => {
      setIsStreaming(false);
      setStream(null);
    };
    if (stream) {
      stream
        .getTracks()
        .forEach((track) => track.addEventListener("ended", handleStreamEnded));
      return () => {
        stream
          .getTracks()
          .forEach((track) =>
            track.removeEventListener("ended", handleStreamEnded),
          );
      };
    }
  }, [stream]);

  const start = async () => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });
    setStream(mediaStream);
    setIsStreaming(true);
    return mediaStream;
  };

  const stop = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsStreaming(false);
    }
  };

  const result: UseMediaStreamResult = {
    type: "webcam",
    start,
    stop,
    isStreaming,
    stream,
  };

  return result;
}



================================================
FILE: src/lib/audio-recorder.ts
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { audioContext } from "./utils";
import AudioRecordingWorklet from "./worklets/audio-processing";
import VolMeterWorket from "./worklets/vol-meter";

import { createWorketFromSrc } from "./audioworklet-registry";
import EventEmitter from "eventemitter3";

function arrayBufferToBase64(buffer: ArrayBuffer) {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export class AudioRecorder extends EventEmitter {
  stream: MediaStream | undefined;
  audioContext: AudioContext | undefined;
  source: MediaStreamAudioSourceNode | undefined;
  recording: boolean = false;
  recordingWorklet: AudioWorkletNode | undefined;
  vuWorklet: AudioWorkletNode | undefined;

  private starting: Promise<void> | null = null;

  constructor(public sampleRate = 16000) {
    super();
  }

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Could not request user media");
    }

    this.starting = new Promise(async (resolve, reject) => {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = await audioContext({ sampleRate: this.sampleRate });
      this.source = this.audioContext.createMediaStreamSource(this.stream);

      const workletName = "audio-recorder-worklet";
      const src = createWorketFromSrc(workletName, AudioRecordingWorklet);

      await this.audioContext.audioWorklet.addModule(src);
      this.recordingWorklet = new AudioWorkletNode(
        this.audioContext,
        workletName,
      );

      this.recordingWorklet.port.onmessage = async (ev: MessageEvent) => {
        // worklet processes recording floats and messages converted buffer
        const arrayBuffer = ev.data.data.int16arrayBuffer;

        if (arrayBuffer) {
          const arrayBufferString = arrayBufferToBase64(arrayBuffer);
          this.emit("data", arrayBufferString);
        }
      };
      this.source.connect(this.recordingWorklet);

      // vu meter worklet
      const vuWorkletName = "vu-meter";
      await this.audioContext.audioWorklet.addModule(
        createWorketFromSrc(vuWorkletName, VolMeterWorket),
      );
      this.vuWorklet = new AudioWorkletNode(this.audioContext, vuWorkletName);
      this.vuWorklet.port.onmessage = (ev: MessageEvent) => {
        this.emit("volume", ev.data.volume);
      };

      this.source.connect(this.vuWorklet);
      this.recording = true;
      resolve();
      this.starting = null;
    });
  }

  stop() {
    // its plausible that stop would be called before start completes
    // such as if the websocket immediately hangs up
    const handleStop = () => {
      this.source?.disconnect();
      this.stream?.getTracks().forEach((track) => track.stop());
      this.stream = undefined;
      this.recordingWorklet = undefined;
      this.vuWorklet = undefined;
    };
    if (this.starting) {
      this.starting.then(handleStop);
      return;
    }
    handleStop();
  }
}



================================================
FILE: src/lib/audio-streamer.ts
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  createWorketFromSrc,
  registeredWorklets,
} from "./audioworklet-registry";

export class AudioStreamer {
  private sampleRate: number = 24000;
  private bufferSize: number = 7680;
  // A queue of audio buffers to be played. Each buffer is a Float32Array.
  private audioQueue: Float32Array[] = [];
  private isPlaying: boolean = false;
  // Indicates if the stream has finished playing, e.g., interrupted.
  private isStreamComplete: boolean = false;
  private checkInterval: number | null = null;
  private scheduledTime: number = 0;
  private initialBufferTime: number = 0.1; //0.1 // 100ms initial buffer
  // Web Audio API nodes. source => gain => destination
  public gainNode: GainNode;
  public source: AudioBufferSourceNode;
  private endOfQueueAudioSource: AudioBufferSourceNode | null = null;

  public onComplete = () => {};

  constructor(public context: AudioContext) {
    this.gainNode = this.context.createGain();
    this.source = this.context.createBufferSource();
    this.gainNode.connect(this.context.destination);
    this.addPCM16 = this.addPCM16.bind(this);
  }

  async addWorklet<T extends (d: any) => void>(
    workletName: string,
    workletSrc: string,
    handler: T
  ): Promise<this> {
    let workletsRecord = registeredWorklets.get(this.context);
    if (workletsRecord && workletsRecord[workletName]) {
      // the worklet already exists on this context
      // add the new handler to it
      workletsRecord[workletName].handlers.push(handler);
      return Promise.resolve(this);
      //throw new Error(`Worklet ${workletName} already exists on context`);
    }

    if (!workletsRecord) {
      registeredWorklets.set(this.context, {});
      workletsRecord = registeredWorklets.get(this.context)!;
    }

    // create new record to fill in as becomes available
    workletsRecord[workletName] = { handlers: [handler] };

    const src = createWorketFromSrc(workletName, workletSrc);
    await this.context.audioWorklet.addModule(src);
    const worklet = new AudioWorkletNode(this.context, workletName);

    //add the node into the map
    workletsRecord[workletName].node = worklet;

    return this;
  }

  /**
   * Converts a Uint8Array of PCM16 audio data into a Float32Array.
   * PCM16 is a common raw audio format, but the Web Audio API generally
   * expects audio data as Float32Arrays with samples normalized between -1.0 and 1.0.
   * This function handles that conversion.
   * @param chunk The Uint8Array containing PCM16 audio data.
   * @returns A Float32Array representing the converted audio data.
   */
  private _processPCM16Chunk(chunk: Uint8Array): Float32Array {
    const float32Array = new Float32Array(chunk.length / 2);
    const dataView = new DataView(chunk.buffer);

    for (let i = 0; i < chunk.length / 2; i++) {
      try {
        const int16 = dataView.getInt16(i * 2, true);
        float32Array[i] = int16 / 32768;
      } catch (e) {
        console.error(e);
      }
    }
    return float32Array;
  }

  addPCM16(chunk: Uint8Array) {
    // Reset the stream complete flag when a new chunk is added.
    this.isStreamComplete = false;
    // Process the chunk into a Float32Array
    let processingBuffer = this._processPCM16Chunk(chunk);
    // Add the processed buffer to the queue if it's larger than the buffer size.
    // This is to ensure that the buffer is not too large.
    while (processingBuffer.length >= this.bufferSize) {
      const buffer = processingBuffer.slice(0, this.bufferSize);
      this.audioQueue.push(buffer);
      processingBuffer = processingBuffer.slice(this.bufferSize);
    }
    // Add the remaining buffer to the queue if it's not empty.
    if (processingBuffer.length > 0) {
      this.audioQueue.push(processingBuffer);
    }
    // Start playing if not already playing.
    if (!this.isPlaying) {
      this.isPlaying = true;
      // Initialize scheduledTime only when we start playing
      this.scheduledTime = this.context.currentTime + this.initialBufferTime;
      this.scheduleNextBuffer();
    }
  }

  private createAudioBuffer(audioData: Float32Array): AudioBuffer {
    const audioBuffer = this.context.createBuffer(
      1,
      audioData.length,
      this.sampleRate
    );
    audioBuffer.getChannelData(0).set(audioData);
    return audioBuffer;
  }

  private scheduleNextBuffer() {
    const SCHEDULE_AHEAD_TIME = 0.2;

    while (
      this.audioQueue.length > 0 &&
      this.scheduledTime < this.context.currentTime + SCHEDULE_AHEAD_TIME
    ) {
      const audioData = this.audioQueue.shift()!;
      const audioBuffer = this.createAudioBuffer(audioData);
      const source = this.context.createBufferSource();

      if (this.audioQueue.length === 0) {
        if (this.endOfQueueAudioSource) {
          this.endOfQueueAudioSource.onended = null;
        }
        this.endOfQueueAudioSource = source;
        source.onended = () => {
          if (
            !this.audioQueue.length &&
            this.endOfQueueAudioSource === source
          ) {
            this.endOfQueueAudioSource = null;
            this.onComplete();
          }
        };
      }

      source.buffer = audioBuffer;
      source.connect(this.gainNode);

      const worklets = registeredWorklets.get(this.context);

      if (worklets) {
        Object.entries(worklets).forEach(([workletName, graph]) => {
          const { node, handlers } = graph;
          if (node) {
            source.connect(node);
            node.port.onmessage = function (ev: MessageEvent) {
              handlers.forEach((handler) => {
                handler.call(node.port, ev);
              });
            };
            node.connect(this.context.destination);
          }
        });
      }
      // Ensure we never schedule in the past
      const startTime = Math.max(this.scheduledTime, this.context.currentTime);
      source.start(startTime);
      this.scheduledTime = startTime + audioBuffer.duration;
    }

    if (this.audioQueue.length === 0) {
      if (this.isStreamComplete) {
        this.isPlaying = false;
        if (this.checkInterval) {
          clearInterval(this.checkInterval);
          this.checkInterval = null;
        }
      } else {
        if (!this.checkInterval) {
          this.checkInterval = window.setInterval(() => {
            if (this.audioQueue.length > 0) {
              this.scheduleNextBuffer();
            }
          }, 100) as unknown as number;
        }
      }
    } else {
      const nextCheckTime =
        (this.scheduledTime - this.context.currentTime) * 1000;
      setTimeout(
        () => this.scheduleNextBuffer(),
        Math.max(0, nextCheckTime - 50)
      );
    }
  }

  stop() {
    this.isPlaying = false;
    this.isStreamComplete = true;
    this.audioQueue = [];
    this.scheduledTime = this.context.currentTime;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.gainNode.gain.linearRampToValueAtTime(
      0,
      this.context.currentTime + 0.1
    );

    setTimeout(() => {
      this.gainNode.disconnect();
      this.gainNode = this.context.createGain();
      this.gainNode.connect(this.context.destination);
    }, 200);
  }

  async resume() {
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
    this.isStreamComplete = false;
    this.scheduledTime = this.context.currentTime + this.initialBufferTime;
    this.gainNode.gain.setValueAtTime(1, this.context.currentTime);
  }

  complete() {
    this.isStreamComplete = true;
    this.onComplete();
  }
}

// // Usage example:
// const audioStreamer = new AudioStreamer();
//
// // In your streaming code:
// function handleChunk(chunk: Uint8Array) {
//   audioStreamer.handleChunk(chunk);
// }
//
// // To start playing (call this in response to a user interaction)
// await audioStreamer.resume();
//
// // To stop playing
// // audioStreamer.stop();



================================================
FILE: src/lib/audioworklet-registry.ts
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * A registry to map attached worklets by their audio-context
 * any module using `audioContext.audioWorklet.addModule(` should register the worklet here
 */
export type WorkletGraph = {
  node?: AudioWorkletNode;
  handlers: Array<(this: MessagePort, ev: MessageEvent) => any>;
};

export const registeredWorklets: Map<
  AudioContext,
  Record<string, WorkletGraph>
> = new Map();

export const createWorketFromSrc = (
  workletName: string,
  workletSrc: string,
) => {
  const script = new Blob(
    [`registerProcessor("${workletName}", ${workletSrc})`],
    {
      type: "application/javascript",
    },
  );

  return URL.createObjectURL(script);
};



================================================
FILE: src/lib/genai-live-client.ts
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  Content,
  GoogleGenAI,
  LiveCallbacks,
  LiveClientToolResponse,
  LiveConnectConfig,
  LiveServerContent,
  LiveServerMessage,
  LiveServerToolCall,
  LiveServerToolCallCancellation,
  Part,
  Session,
} from "@google/genai";

import { EventEmitter } from "eventemitter3";
import { difference } from "lodash";
import { LiveClientOptions, StreamingLog } from "../types";
import { base64ToArrayBuffer } from "./utils";

/**
 * Event types that can be emitted by the MultimodalLiveClient.
 * Each event corresponds to a specific message from GenAI or client state change.
 */
export interface LiveClientEventTypes {
  // Emitted when audio data is received
  audio: (data: ArrayBuffer) => void;
  // Emitted when the connection closes
  close: (event: CloseEvent) => void;
  // Emitted when content is received from the server
  content: (data: LiveServerContent) => void;
  // Emitted when an error occurs
  error: (error: ErrorEvent) => void;
  // Emitted when the server interrupts the current generation
  interrupted: () => void;
  // Emitted for logging events
  log: (log: StreamingLog) => void;
  // Emitted when the connection opens
  open: () => void;
  // Emitted when the initial setup is complete
  setupcomplete: () => void;
  // Emitted when a tool call is received
  toolcall: (toolCall: LiveServerToolCall) => void;
  // Emitted when a tool call is cancelled
  toolcallcancellation: (
    toolcallCancellation: LiveServerToolCallCancellation
  ) => void;
  // Emitted when the current turn is complete
  turncomplete: () => void;
}

/**
 * A event-emitting class that manages the connection to the websocket and emits
 * events to the rest of the application.
 * If you dont want to use react you can still use this.
 */
export class GenAILiveClient extends EventEmitter<LiveClientEventTypes> {
  protected client: GoogleGenAI;

  private _status: "connected" | "disconnected" | "connecting" = "disconnected";
  public get status() {
    return this._status;
  }

  private _session: Session | null = null;
  public get session() {
    return this._session;
  }

  private _model: string | null = null;
  public get model() {
    return this._model;
  }

  protected config: LiveConnectConfig | null = null;

  public getConfig() {
    return { ...this.config };
  }

  constructor(options: LiveClientOptions) {
    super();
    this.client = new GoogleGenAI(options);
    this.send = this.send.bind(this);
    this.onopen = this.onopen.bind(this);
    this.onerror = this.onerror.bind(this);
    this.onclose = this.onclose.bind(this);
    this.onmessage = this.onmessage.bind(this);
  }

  protected log(type: string, message: StreamingLog["message"]) {
    const log: StreamingLog = {
      date: new Date(),
      type,
      message,
    };
    this.emit("log", log);
  }

  async connect(model: string, config: LiveConnectConfig): Promise<boolean> {
    if (this._status === "connected" || this._status === "connecting") {
      return false;
    }

    this._status = "connecting";
    this.config = config;
    this._model = model;

    const callbacks: LiveCallbacks = {
      onopen: this.onopen,
      onmessage: this.onmessage,
      onerror: this.onerror,
      onclose: this.onclose,
    };

    try {
      this._session = await this.client.live.connect({
        model,
        config,
        callbacks,
      });
    } catch (e) {
      console.error("Error connecting to GenAI Live:", e);
      this._status = "disconnected";
      return false;
    }

    this._status = "connected";
    return true;
  }

  public disconnect() {
    if (!this.session) {
      return false;
    }
    this.session?.close();
    this._session = null;
    this._status = "disconnected";

    this.log("client.close", `Disconnected`);
    return true;
  }

  protected onopen() {
    this.log("client.open", "Connected");
    this.emit("open");
  }

  protected onerror(e: ErrorEvent) {
    this.log("server.error", e.message);
    this.emit("error", e);
  }

  protected onclose(e: CloseEvent) {
    this.log(
      `server.close`,
      `disconnected ${e.reason ? `with reason: ${e.reason}` : ``}`
    );
    this.emit("close", e);
  }

  protected async onmessage(message: LiveServerMessage) {
    if (message.setupComplete) {
      this.log("server.send", "setupComplete");
      this.emit("setupcomplete");
      return;
    }
    if (message.toolCall) {
      this.log("server.toolCall", message);
      this.emit("toolcall", message.toolCall);
      return;
    }
    if (message.toolCallCancellation) {
      this.log("server.toolCallCancellation", message);
      this.emit("toolcallcancellation", message.toolCallCancellation);
      return;
    }

    // this json also might be `contentUpdate { interrupted: true }`
    // or contentUpdate { end_of_turn: true }
    if (message.serverContent) {
      const { serverContent } = message;
      if ("interrupted" in serverContent) {
        this.log("server.content", "interrupted");
        this.emit("interrupted");
        return;
      }
      if ("turnComplete" in serverContent) {
        this.log("server.content", "turnComplete");
        this.emit("turncomplete");
      }

      if ("modelTurn" in serverContent) {
        let parts: Part[] = serverContent.modelTurn?.parts || [];

        // when its audio that is returned for modelTurn
        const audioParts = parts.filter(
          (p) => p.inlineData && p.inlineData.mimeType?.startsWith("audio/pcm")
        );
        const base64s = audioParts.map((p) => p.inlineData?.data);

        // strip the audio parts out of the modelTurn
        const otherParts = difference(parts, audioParts);
        // console.log("otherParts", otherParts);

        base64s.forEach((b64) => {
          if (b64) {
            const data = base64ToArrayBuffer(b64);
            this.emit("audio", data);
            this.log(`server.audio`, `buffer (${data.byteLength})`);
          }
        });
        if (!otherParts.length) {
          return;
        }

        parts = otherParts;

        const content: { modelTurn: Content } = { modelTurn: { parts } };
        this.emit("content", content);
        this.log(`server.content`, message);
      }
    } else {
      console.log("received unmatched message", message);
    }
  }

  /**
   * send realtimeInput, this is base64 chunks of "audio/pcm" and/or "image/jpg"
   */
  sendRealtimeInput(chunks: Array<{ mimeType: string; data: string }>) {
    let hasAudio = false;
    let hasVideo = false;
    for (const ch of chunks) {
      this.session?.sendRealtimeInput({ media: ch });
      if (ch.mimeType.includes("audio")) {
        hasAudio = true;
      }
      if (ch.mimeType.includes("image")) {
        hasVideo = true;
      }
      if (hasAudio && hasVideo) {
        break;
      }
    }
    const message =
      hasAudio && hasVideo
        ? "audio + video"
        : hasAudio
        ? "audio"
        : hasVideo
        ? "video"
        : "unknown";
    this.log(`client.realtimeInput`, message);
  }

  /**
   *  send a response to a function call and provide the id of the functions you are responding to
   */
  sendToolResponse(toolResponse: LiveClientToolResponse) {
    if (
      toolResponse.functionResponses &&
      toolResponse.functionResponses.length
    ) {
      this.session?.sendToolResponse({
        functionResponses: toolResponse.functionResponses,
      });
      this.log(`client.toolResponse`, toolResponse);
    }
  }

  /**
   * send normal content parts such as { text }
   */
  send(parts: Part | Part[], turnComplete: boolean = true) {
    this.session?.sendClientContent({ turns: parts, turnComplete });
    this.log(`client.send`, {
      turns: Array.isArray(parts) ? parts : [parts],
      turnComplete,
    });
  }
}



================================================
FILE: src/lib/store-logger.ts
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { create } from "zustand";
import { StreamingLog } from "../types";
import { mockLogs } from "../components/logger/mock-logs";

interface StoreLoggerState {
  maxLogs: number;
  logs: StreamingLog[];
  log: (streamingLog: StreamingLog) => void;
  clearLogs: () => void;
}

export const useLoggerStore = create<StoreLoggerState>((set, get) => ({
  maxLogs: 100,
  logs: [], //mockLogs,
  log: ({ date, type, message }: StreamingLog) => {
    set((state) => {
      const prevLog = state.logs.at(-1);
      if (prevLog && prevLog.type === type && prevLog.message === message) {
        return {
          logs: [
            ...state.logs.slice(0, -1),
            {
              date,
              type,
              message,
              count: prevLog.count ? prevLog.count + 1 : 1,
            } as StreamingLog,
          ],
        };
      }
      return {
        logs: [
          ...state.logs.slice(-(get().maxLogs - 1)),
          {
            date,
            type,
            message,
          } as StreamingLog,
        ],
      };
    });
  },

  clearLogs: () => {
    console.log("clear log");
    set({ logs: [] });
  },
  setMaxLogs: (n: number) => set({ maxLogs: n }),
}));



================================================
FILE: src/lib/utils.ts
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type GetAudioContextOptions = AudioContextOptions & {
  id?: string;
};

const map: Map<string, AudioContext> = new Map();

export const audioContext: (
  options?: GetAudioContextOptions
) => Promise<AudioContext> = (() => {
  const didInteract = new Promise((res) => {
    window.addEventListener("pointerdown", res, { once: true });
    window.addEventListener("keydown", res, { once: true });
  });

  return async (options?: GetAudioContextOptions) => {
    try {
      const a = new Audio();
      a.src =
        "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
      await a.play();
      if (options?.id && map.has(options.id)) {
        const ctx = map.get(options.id);
        if (ctx) {
          return ctx;
        }
      }
      const ctx = new AudioContext(options);
      if (options?.id) {
        map.set(options.id, ctx);
      }
      return ctx;
    } catch (e) {
      await didInteract;
      if (options?.id && map.has(options.id)) {
        const ctx = map.get(options.id);
        if (ctx) {
          return ctx;
        }
      }
      const ctx = new AudioContext(options);
      if (options?.id) {
        map.set(options.id, ctx);
      }
      return ctx;
    }
  };
})();

export function base64ToArrayBuffer(base64: string) {
  var binaryString = atob(base64);
  var bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}



================================================
FILE: src/lib/worklets/audio-processing.ts
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const AudioRecordingWorklet = `
class AudioProcessingWorklet extends AudioWorkletProcessor {

  // send and clear buffer every 2048 samples, 
  // which at 16khz is about 8 times a second
  buffer = new Int16Array(2048);

  // current write index
  bufferWriteIndex = 0;

  constructor() {
    super();
    this.hasAudio = false;
  }

  /**
   * @param inputs Float32Array[][] [input#][channel#][sample#] so to access first inputs 1st channel inputs[0][0]
   * @param outputs Float32Array[][]
   */
  process(inputs) {
    if (inputs[0].length) {
      const channel0 = inputs[0][0];
      this.processChunk(channel0);
    }
    return true;
  }

  sendAndClearBuffer(){
    this.port.postMessage({
      event: "chunk",
      data: {
        int16arrayBuffer: this.buffer.slice(0, this.bufferWriteIndex).buffer,
      },
    });
    this.bufferWriteIndex = 0;
  }

  processChunk(float32Array) {
    const l = float32Array.length;
    
    for (let i = 0; i < l; i++) {
      // convert float32 -1 to 1 to int16 -32768 to 32767
      const int16Value = float32Array[i] * 32768;
      this.buffer[this.bufferWriteIndex++] = int16Value;
      if(this.bufferWriteIndex >= this.buffer.length) {
        this.sendAndClearBuffer();
      }
    }

    if(this.bufferWriteIndex >= this.buffer.length) {
      this.sendAndClearBuffer();
    }
  }
}
`;

export default AudioRecordingWorklet;



================================================
FILE: src/lib/worklets/vol-meter.ts
================================================
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const VolMeterWorket = `
  class VolMeter extends AudioWorkletProcessor {
    volume
    updateIntervalInMS
    nextUpdateFrame

    constructor() {
      super()
      this.volume = 0
      this.updateIntervalInMS = 25
      this.nextUpdateFrame = this.updateIntervalInMS
      this.port.onmessage = event => {
        if (event.data.updateIntervalInMS) {
          this.updateIntervalInMS = event.data.updateIntervalInMS
        }
      }
    }

    get intervalInFrames() {
      return (this.updateIntervalInMS / 1000) * sampleRate
    }

    process(inputs) {
      const input = inputs[0]

      if (input.length > 0) {
        const samples = input[0]
        let sum = 0
        let rms = 0

        for (let i = 0; i < samples.length; ++i) {
          sum += samples[i] * samples[i]
        }

        rms = Math.sqrt(sum / samples.length)
        this.volume = Math.max(rms, this.volume * 0.7)

        this.nextUpdateFrame -= samples.length
        if (this.nextUpdateFrame < 0) {
          this.nextUpdateFrame += this.intervalInFrames
          this.port.postMessage({volume: this.volume})
        }
      }

      return true
    }
  }`;

export default VolMeterWorket;



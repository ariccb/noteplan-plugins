// @flow
//--------------------------------------------------------------------------
// Dashboard React component to show a Project's Icon
// Called by ProjectItem + DialogForProjectItems components
// Last updated 24.6.2024 for v2.0.0-b14 by @jgclark
//--------------------------------------------------------------------------

import * as React from 'react'
import { CircularProgressbar, CircularProgressbarWithChildren, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'
import type { TSectionItem } from '../../types.js'
import { logDebug, logInfo } from '@helpers/react/reactDev.js'

type Props = {
  item: TSectionItem,
}

function ProjectIcon({ item }: Props): React.Node {

  const percentComplete = item.project?.percentComplete ?? 0

  // using https://www.npmjs.com/package/react-circular-progressbar
  const projectIcon = (
    <CircularProgressbarWithChildren
      // background path
      /*text={`${percentage}%`}*/
      value={percentComplete}
      strokeWidth={50}
      styles={buildStyles({
        strokeLinecap: "butt",
        // backgroundColor: "var(--bg-sidebar-color)",
        backgroundColor: "transparent",
        pathColor: "var(--tint-color)",
      })}
    >
      {/* foreground path */}
      <CircularProgressbar
        value={100}
        strokeWidth={5}
        styles={buildStyles({
          strokeLinecap: "butt",
          // backgroundColor: "var(--bg-sidebar-color)",
          backgroundColor: "transparent",
          pathColor: "var(--tint-color)",
        })}
      ></CircularProgressbar>
    </CircularProgressbarWithChildren>
  )

  return (
    <span className="projectIcon">
      {projectIcon}
    </span>
  )
}

export default ProjectIcon

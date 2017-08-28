/* eslint-disable no-unused-vars */
import thumbnail from './playIcon.png'
import React from 'react'
import { Table } from 'react-bootstrap'
/* eslint-enable no-unused-vars */

export default ({photos, loading}) => {
  if (loading) return (<h2>Loading...</h2>)
  if (photos.length === 0) return (<h2>You haven't uploaded any photos yet!</h2>)

  const onClick = (i) => console.log(photos[i].attributes.Photo.slice(0,20))

  const output = photos.map((photo, i) => {
    const header = photo.attributes.Photo.slice(0,30)
    const match = header.match(/data\:(\w+)\/(\w+);base/)
    if ( match && match[1] === 'video') {
      return (
        <tr key={photo.attributes.ID} onClick={() => onClick(i)}>
        <td><img src={ thumbnail }  className='App-avatar'></img></td>
        </tr>
      )
    }
    return (
      <tr key={photo.attributes.ID} onClick={() => onClick(i)}>
        <td><img src={photo.attributes.Photo} className='App-avatar'></img></td>
      </tr>
    )
  })

  return (
    <div>
      <Table>
        <tbody>
          {output}
        </tbody>
      </Table>
    </div>
  )
}

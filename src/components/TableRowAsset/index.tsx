import {hues} from '@sanity/color'
import {CheckmarkCircleIcon, EditIcon, WarningFilledIcon} from '@sanity/icons'
import {Box, Checkbox, Container, Flex, Spinner, Text, Tooltip} from '@sanity/ui'
import formatRelative from 'date-fns/formatRelative'
import filesize from 'filesize'
import React, {memo, MouseEvent, RefObject} from 'react'
import {useDispatch} from 'react-redux'
import styled, {css} from 'styled-components'
import {Box as LegacyBox, Flex as LegacyFlex, Grid as LegacyGrid} from 'theme-ui'
import {useAssetSourceActions} from '../../contexts/AssetSourceDispatchContext'
import useKeyPress from '../../hooks/useKeyPress'
import useTypedSelector from '../../hooks/useTypedSelector'
import {assetsActions, selectAssetById} from '../../modules/assets'
import {dialogActions} from '../../modules/dialog'
import getAssetResolution from '../../utils/getAssetResolution'
import imageDprUrl from '../../utils/imageDprUrl'
import {isFileAsset, isImageAsset} from '../../utils/typeGuards'
import FileIcon from '../FileIcon'
import Image from '../Image'

type Props = {
  id: string
  selected: boolean
}

const ContainerGrid = styled(LegacyGrid)<{selected?: boolean; updating?: boolean}>`
  align-items: center;
  cursor: ${props => (props.selected ? 'default' : 'pointer')};
  height: 100%;
  pointer-events: ${props => (props.updating ? 'none' : 'auto')};
  user-select: none;
  white-space: nowrap;

  ${props =>
    !props.updating &&
    css`
      @media (hover: hover) and (pointer: fine) {
        &:hover {
          background: ${hues.gray?.[950].hex};
        }
      }
    `}
`

const ContextActionContainer = styled(LegacyFlex)`
  cursor: pointer;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${hues.gray?.[900].hex};
    }
  }
`

const StyledWarningIcon = styled(WarningFilledIcon)(({theme}) => {
  return {
    color: theme.sanity.color.spot.red
  }
})

const TableRowAsset = (props: Props) => {
  const {id, selected} = props

  // Refs
  const shiftPressed: RefObject<boolean> = useKeyPress('shift')

  // Redux
  const dispatch = useDispatch()
  const lastPicked = useTypedSelector(state => state.assets.lastPicked)
  const item = useTypedSelector(state => selectAssetById(state, id))

  const asset = item?.asset
  const error = item?.error
  const isOpaque = item?.asset?.metadata?.isOpaque
  const picked = item?.picked
  const updating = item?.updating

  const {onSelect} = useAssetSourceActions()

  // Short circuit if no asset is available
  if (!asset) {
    return null
  }

  // Callbacks
  const handleContextActionClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()

    if (onSelect) {
      dispatch(dialogActions.showAssetEdit({assetId: asset._id}))
    } else {
      if (shiftPressed.current && !picked) {
        dispatch(assetsActions.pickRange({startId: lastPicked || asset._id, endId: asset._id}))
      } else {
        dispatch(assetsActions.pick({assetId: asset._id, picked: !picked}))
      }
    }
  }

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()

    if (onSelect) {
      onSelect([
        {
          kind: 'assetDocumentId',
          value: asset._id
        }
      ])
    } else {
      if (shiftPressed.current) {
        if (picked) {
          dispatch(assetsActions.pick({assetId: asset._id, picked: !picked}))
        } else {
          dispatch(assetsActions.pickRange({startId: lastPicked || asset._id, endId: asset._id}))
        }
      } else {
        dispatch(dialogActions.showAssetEdit({assetId: asset._id}))
      }
    }
  }

  const opacityCell = updating ? 0.5 : 1
  const opacityPreview = selected || updating ? 0.1 : 1

  return (
    <ContainerGrid
      onClick={selected ? undefined : handleClick}
      selected={selected}
      sx={{
        gridColumnGap: [0, null, null, 3],
        gridRowGap: [0],
        gridTemplateColumns: ['tableSmall', null, null, 'tableLarge'],
        gridTemplateRows: ['auto', null, null, '1fr']
      }}
      updating={item.updating}
    >
      {/* Picked checkbox */}
      <ContextActionContainer
        onClick={handleContextActionClick}
        sx={{
          alignItems: 'center',
          gridColumn: 1,
          gridRowStart: ['1', null, null, 'auto'],
          gridRowEnd: ['span 5', null, null, 'auto'],
          height: '100%',
          justifyContent: 'center',
          opacity: opacityCell,
          position: 'relative'
        }}
      >
        {onSelect ? (
          <EditIcon
            style={{
              flexShrink: 0,
              opacity: 0.5
            }}
          />
        ) : (
          <Checkbox
            checked={picked}
            readOnly
            style={{
              pointerEvents: 'none', // TODO: consider alternative for usability
              transform: 'scale(0.8)'
            }}
          />
        )}
      </ContextActionContainer>

      {/* Preview image + spinner */}
      <LegacyBox
        sx={{
          gridColumn: [2],
          gridRowStart: ['1', null, null, 'auto'],
          gridRowEnd: ['span 5', null, null, 'auto'],
          height: '90px',
          width: '100px'
        }}
      >
        <Flex align="center" justify="center" style={{height: '100%', position: 'relative'}}>
          <Box style={{height: '100%', opacity: opacityPreview, position: 'relative'}}>
            {/* File icon */}
            {isFileAsset(asset) && <FileIcon extension={asset.extension} width="40px" />}

            {/* Image */}
            {isImageAsset(asset) && (
              <Image
                draggable={false}
                showCheckerboard={!isOpaque}
                src={imageDprUrl(asset, {height: 100, width: 100})}
              />
            )}
          </Box>

          {/* Spinner */}
          {updating && (
            <Flex
              align="center"
              justify="center"
              style={{
                height: '100%',
                left: 0,
                position: 'absolute',
                top: 0,
                width: '100%'
              }}
            >
              <Spinner />
            </Flex>
          )}

          {/* Selected check icon */}
          {selected && !updating && (
            <Flex
              align="center"
              justify="center"
              style={{
                height: '100%',
                left: 0,
                position: 'absolute',
                top: 0,
                width: '100%'
              }}
            >
              <Text size={2}>
                <CheckmarkCircleIcon />
              </Text>
            </Flex>
          )}
        </Flex>
      </LegacyBox>

      {/* Filename */}
      <LegacyBox
        sx={{
          gridColumn: [3],
          gridRow: [2, null, null, 'auto'],
          marginLeft: [3, null, null, 0],
          opacity: opacityCell
        }}
      >
        <Text muted size={1} style={{lineHeight: '2em'}} textOverflow="ellipsis">
          {asset.originalFilename}
        </Text>
      </LegacyBox>

      {/* Resolution */}
      <LegacyBox
        sx={{
          gridColumn: [3, null, null, 4],
          gridRow: [3, null, null, 'auto'],
          marginLeft: [3, null, null, 0],
          opacity: opacityCell
        }}
      >
        <Text muted size={1} style={{lineHeight: '2em'}} textOverflow="ellipsis">
          {isImageAsset(asset) && getAssetResolution(asset)}
        </Text>
      </LegacyBox>

      {/* MIME type */}
      <LegacyBox
        sx={{
          display: ['none', null, null, 'block'],
          gridColumn: 5,
          gridRow: 'auto',
          opacity: opacityCell
        }}
      >
        <Text muted size={1} style={{lineHeight: '2em'}} textOverflow="ellipsis">
          {asset.mimeType}
        </Text>
      </LegacyBox>

      {/* Size */}
      <LegacyBox
        sx={{
          display: ['none', null, null, 'block'],
          gridColumn: 6,
          gridRow: 'auto',
          opacity: opacityCell
        }}
      >
        <Text muted size={1} style={{lineHeight: '2em'}} textOverflow="ellipsis">
          {filesize(asset.size, {base: 10, round: 0})}
        </Text>
      </LegacyBox>

      {/* Last updated */}
      <LegacyBox
        sx={{
          gridColumn: [3, null, null, 7],
          gridRow: [4, null, null, 'auto'],
          marginLeft: [3, null, null, 0],
          opacity: opacityCell
        }}
      >
        <Text muted size={1} style={{lineHeight: '2em'}} textOverflow="ellipsis">
          {formatRelative(new Date(asset._updatedAt), new Date())}
        </Text>
      </LegacyBox>

      {/* Error */}
      <LegacyBox
        sx={{
          gridColumn: [4, null, null, 8],
          gridRowStart: '1',
          gridRowEnd: ['span 5', null, null, 'auto'],
          mx: 'auto',
          opacity: opacityCell
        }}
      >
        {/* TODO: DRY */}
        {/* Error button */}
        {error && (
          <Box padding={3}>
            <Tooltip
              content={
                <Container padding={2} width={0}>
                  <Text size={1}>{error}</Text>
                </Container>
              }
              placement="left"
              portal
            >
              <Text size={1}>
                <StyledWarningIcon color="critical" />
              </Text>
            </Tooltip>
          </Box>
        )}
      </LegacyBox>
    </ContainerGrid>
  )
}

export default memo(TableRowAsset)

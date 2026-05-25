import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #C4737A 0%, #9B5968 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="168" height="154" viewBox="0 0 100 90">
        <path
          d="M 50 80 C 50 80, 5 50, 5 25 C 5 10 17 2 30 8 C 38 12 44 18 50 25 C 56 18 62 12 70 8 C 83 2 95 10 95 25 C 95 50 50 80 50 80 Z"
          fill="white"
        />
      </svg>
    </div>
  )
}

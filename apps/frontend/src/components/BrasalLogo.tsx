import { Text } from '@mantine/core';
import logoImage from '../assets/brasal-logo.png';

export function BrasalLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 28,
          height: 28,
          backgroundImage: `url(${logoImage})`,
          // auto 100% + left center: the source image is a wide icon+wordmark lockup — sizing to
          // the container's height and anchoring left shows just the icon, uncropped and
          // undistorted, instead of stretching the whole rectangle into a square.
          backgroundSize: 'auto 100%',
          backgroundPosition: 'left center',
          backgroundRepeat: 'no-repeat',
          flexShrink: 0,
        }}
      />
      <Text fw={700} size="lg" c="dark">
        Workflow
      </Text>
    </div>
  );
}

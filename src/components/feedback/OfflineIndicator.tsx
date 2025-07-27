import { FC, useEffect, useState } from 'react';
import { WifiIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { networkHandler, NetworkStatus } from '../../utils/network-handler';
import { cn } from '../../utils/cn';

export interface OfflineIndicatorProps {
  className?: string;
  showWhenOnline?: boolean;
}

export const OfflineIndicator: FC<OfflineIndicatorProps> = ({
  className,
  showWhenOnline = false,
}) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    networkHandler.getNetworkStatus()
  );
  const [queuedRequests, setQueuedRequests] = useState(0);

  useEffect(() => {
    const handleStatusChange = (status: NetworkStatus) => {
      setNetworkStatus(status);
    };

    networkHandler.addStatusListener(handleStatusChange);

    // Update queued requests count periodically
    const interval = setInterval(() => {
      setQueuedRequests(networkHandler.getQueuedRequestsCount());
    }, 1000);

    return () => {
      networkHandler.removeStatusListener(handleStatusChange);
      clearInterval(interval);
    };
  }, []);

  if (networkStatus.isOnline && !showWhenOnline) {
    return null;
  }

  const getConnectionQuality = (): 'good' | 'fair' | 'poor' => {
    if (!networkStatus.isOnline) return 'poor';

    const { effectiveType, downlink } = networkStatus;

    if (effectiveType === '4g' || effectiveType === '5g' || (downlink && downlink > 2)) {
      return 'good';
    }

    if (effectiveType === '3g' || (downlink && downlink > 0.5)) {
      return 'fair';
    }

    return 'poor';
  };

  const connectionQuality = getConnectionQuality();

  const getStatusColor = () => {
    if (!networkStatus.isOnline) return 'text-red-600 bg-red-50 border-red-200';

    switch (connectionQuality) {
      case 'good':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'fair':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = () => {
    if (!networkStatus.isOnline) {
      return queuedRequests > 0
        ? `离线模式 (${queuedRequests} 个请求待处理)`
        : '离线模式';
    }

    const connectionText = networkStatus.effectiveType
      ? `${networkStatus.effectiveType.toUpperCase()}`
      : '在线';

    return `${connectionText} 连接`;
  };

  const getStatusIcon = () => {
    if (!networkStatus.isOnline) {
      return <ExclamationTriangleIcon className="h-4 w-4" />;
    }

    return <WifiIcon className="h-4 w-4" />;
  };

  return (
    <div
      className={cn(
        'inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border text-sm font-medium',
        getStatusColor(),
        className
      )}
      role="status"
      aria-live="polite"
    >
      {getStatusIcon()}
      <span>{getStatusText()}</span>

      {networkStatus.isOnline && networkStatus.downlink && (
        <span className="text-xs opacity-75">
          {networkStatus.downlink.toFixed(1)} Mbps
        </span>
      )}
    </div>
  );
};
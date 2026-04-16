import { NextRequest, NextResponse } from 'next/server';

import { listSaasModules, listSaasPlatforms } from '@/lib/mysql-saas';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const platformId = request.nextUrl.searchParams.get('platform_id');
    const [modules, platforms] = await Promise.all([
      listSaasModules(platformId || undefined),
      listSaasPlatforms(),
    ]);

    const platformMap = new Map(platforms.map((platform) => [platform.id, platform]));

    const result = modules.map((module) => {
      const platform = platformMap.get(module.platformId) || null;
      return {
        ...module,
        fullApiUrl: platform?.apiBaseUrl
          ? `${platform.apiBaseUrl}${module.apiEndpoint || ''}`
          : module.apiEndpoint || null,
        platform: platform
          ? {
              id: platform.id,
              name: platform.name,
              apiBaseUrl: platform.apiBaseUrl,
              serverType: platform.serverType,
            }
          : null,
      };
    });

    return NextResponse.json({ modules: result, platformId: platformId || null });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

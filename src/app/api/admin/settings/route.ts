import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import AdminSettings from '@/models/AdminSettings';
import MaintenanceSettings from '@/models/MaintenanceSettings';
import connectDB from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const [adminSettings, maintenanceSettings] = await Promise.all([
      AdminSettings.findOne(),
      MaintenanceSettings.findOne()
    ]);
    
    if (!adminSettings) {
      const defaultAdminSettings = new AdminSettings();
      await defaultAdminSettings.save();
      return NextResponse.json({
        admin: defaultAdminSettings,
        maintenance: maintenanceSettings || {},
        ads_config: {}
      });
    }

    return NextResponse.json({
      admin: adminSettings,
      maintenance: maintenanceSettings || {},
      ads_config: adminSettings.ads_config || {}
    });
  } catch (error) {
    console.error('Error in GET /api/admin/settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    await connectDB();

    let adminSettings = await AdminSettings.findOne();
    if (!adminSettings) {
      adminSettings = new AdminSettings();
    }

    // Update settings
    adminSettings.bot_config = {
      value: JSON.stringify(data.bot)
    };
    adminSettings.smtp_config = {
      value: JSON.stringify(data.smtp)
    };
    adminSettings.site_config = {
      value: JSON.stringify(data.site)
    };
    adminSettings.notification_config = {
      value: JSON.stringify(data.notifications)
    };
    adminSettings.ads_config = {
      value: JSON.stringify(data.ads)
    };

    await adminSettings.save();

    // Handle maintenance settings
    if (data.maintenance) {
      const maintenanceSettings = await MaintenanceSettings.findOne();
      if (!maintenanceSettings) {
        const newMaintenanceSettings = new MaintenanceSettings(data.maintenance);
        await newMaintenanceSettings.save();
      } else {
        Object.assign(maintenanceSettings, data.maintenance);
        await maintenanceSettings.save();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/admin/settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
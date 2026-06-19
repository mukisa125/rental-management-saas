import { useEffect, useState } from 'react';
import { tenantPortalAPI } from '../../services/api';
import { MapPin, DoorOpen, Calendar, DollarSign, User } from 'lucide-react';
import { formatUGX } from '../../utils/currency';

const TenantMyRental = () => {
  const [rentalInfo, setRentalInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRentalInfo();
  }, []);

  const fetchRentalInfo = async () => {
    try {
      const response = await tenantPortalAPI.getRentalInfo();
      setRentalInfo(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching rental info:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!rentalInfo) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-600">No rental information found.</p>
      </div>
    );
  }

  const leaseStartDate = new Date(rentalInfo.leaseStart);
  const leaseEndDate = new Date(rentalInfo.leaseEnd);
  const today = new Date();
  const daysRemaining = Math.ceil((leaseEndDate - today) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Rental</h1>
        <p className="text-gray-600 mt-2">View your rental property and lease details</p>
      </div>

      {/* Property Details */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Property Details</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Property Info */}
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Property Name</p>
                  <p className="text-lg font-semibold text-gray-900">{rentalInfo.property?.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{rentalInfo.property?.location}</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <DoorOpen className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Unit Number</p>
                  <p className="text-lg font-semibold text-gray-900">{rentalInfo.unit?.unitNumber}</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Property Owner</p>
                  <p className="text-lg font-semibold text-gray-900">{rentalInfo.owner?.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{rentalInfo.owner?.email}</p>
                  {rentalInfo.owner?.phone && (
                    <p className="text-sm text-gray-600">{rentalInfo.owner?.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Unit Details */}
            <div className="space-y-4">
              {rentalInfo.unit?.bedrooms !== undefined && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-600">Bedrooms</p>
                  <p className="text-2xl font-bold text-gray-900">{rentalInfo.unit.bedrooms}</p>
                </div>
              )}
              {rentalInfo.unit?.bathrooms !== undefined && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-600">Bathrooms</p>
                  <p className="text-2xl font-bold text-gray-900">{rentalInfo.unit.bathrooms}</p>
                </div>
              )}
              {rentalInfo.unit?.area && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-600">Area (sqft)</p>
                  <p className="text-2xl font-bold text-gray-900">{rentalInfo.unit.area}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lease Details */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Lease Details</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Lease Start Date</p>
                <p className="text-lg font-semibold text-gray-900">{leaseStartDate.toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Lease End Date</p>
                <p className="text-lg font-semibold text-gray-900">{leaseEndDate.toLocaleDateString()}</p>
                <p className={`text-sm mt-1 ${daysRemaining > 30 ? 'text-green-600' : 'text-red-600'}`}>
                  {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Lease expired'}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Rent</p>
                <p className="text-lg font-semibold text-gray-900">{formatUGX(rentalInfo.rentAmount)}</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Security Deposit</p>
                <p className="text-lg font-semibold text-gray-900">{formatUGX(rentalInfo.securityDeposit)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      {rentalInfo.outstandingBalance !== undefined && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Financial Summary</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-gray-600">Monthly Rent</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{formatUGX(rentalInfo.rentAmount)}</p>
              </div>
              <div className={`p-4 rounded-lg border ${
                rentalInfo.outstandingBalance > 0 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <p className="text-sm font-medium text-gray-600">Outstanding Balance</p>
                <p className={`text-2xl font-bold mt-2 ${
                  rentalInfo.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatUGX(rentalInfo.outstandingBalance)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantMyRental;
